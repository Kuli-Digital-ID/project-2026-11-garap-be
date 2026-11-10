import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AI_PROVIDERS, AiProviderId } from '@common/constants/domain.constant';
import { SecretBox } from '@common/utils/secret-box.util';
import { aiProviderInclude, toAiProvider } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '@modules/activity/audit.service';
import { ConnectAiProviderDto } from './core/dto/ai-provider.dto';
import { PROVIDER_INFO, ProviderCredentials, ProviderError, chat, listModels } from './core/helpers/provider-clients';

@Injectable()
export class AiProvidersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private check(provider: string): AiProviderId {
    if (!(AI_PROVIDERS as readonly string[]).includes(provider)) {
      throw new NotFoundException(`Penyedia "${provider}" tidak dikenal. Pilihan: ${AI_PROVIDERS.join(', ')}`);
    }
    return provider as AiProviderId;
  }

  /** Katalog penyedia + status koneksi workspace. */
  async list() {
    const rows = await this.prisma.aiProvider.findMany({ include: aiProviderInclude });
    return AI_PROVIDERS.map((id) => {
      const row = rows.find((r) => r.provider === id);
      return { id, name: PROVIDER_INFO[id].name, needsKey: PROVIDER_INFO[id].needsKey, needsBaseUrl: !!PROVIDER_INFO[id].needsBaseUrl, connection: row ? toAiProvider(row) : null };
    });
  }

  /** Hubungkan / ganti key: diuji ke API penyedia dulu, baru disimpan terenkripsi. */
  async connect(user: JwtPayload, providerParam: string, dto: ConnectAiProviderDto) {
    const provider = this.check(providerParam);
    const info = PROVIDER_INFO[provider];
    if (info.needsKey && !dto.apiKey) throw new BadRequestException('API key wajib diisi');
    if (info.needsBaseUrl && !dto.baseUrl) throw new BadRequestException('Base URL wajib diisi untuk server sendiri');

    let models: string[];
    try {
      models = await listModels({ provider, apiKey: dto.apiKey, baseUrl: dto.baseUrl });
    } catch (e) {
      throw new BadRequestException(e instanceof ProviderError ? e.message : 'Uji koneksi gagal');
    }
    if (!models.length) throw new BadRequestException('Koneksi berhasil tetapi penyedia tidak mengembalikan model apa pun');

    const existed = await this.prisma.aiProvider.findUnique({ where: { provider } });
    const data = {
      api_key_enc: dto.apiKey ? SecretBox.seal(dto.apiKey) : null,
      key_hint: dto.apiKey ? dto.apiKey.slice(-4) : '',
      base_url: dto.baseUrl ?? null,
      models,
      status: 'terhubung',
      last_error: null,
      last_tested_at: new Date(),
    };
    const row = await this.prisma.aiProvider.upsert({
      where: { provider },
      create: { provider, added_by: user.userId, ...data },
      update: data,
      include: aiProviderInclude,
    });
    await this.audit.log(user.userId, existed ? 'mengganti API key penyedia AI' : 'menghubungkan penyedia AI', info.name, 'agent');
    return toAiProvider(row);
  }

  /** Uji ulang key tersimpan dan perbarui daftar model. */
  async test(user: JwtPayload, providerParam: string) {
    const provider = this.check(providerParam);
    const creds = await this.credentials(provider);
    try {
      const models = await listModels(creds);
      const row = await this.prisma.aiProvider.update({
        where: { provider }, data: { models, status: 'terhubung', last_error: null, last_tested_at: new Date() }, include: aiProviderInclude,
      });
      return toAiProvider(row);
    } catch (e) {
      const msg = e instanceof ProviderError ? e.message : 'Uji koneksi gagal';
      const row = await this.prisma.aiProvider.update({
        where: { provider }, data: { status: 'gagal', last_error: msg, last_tested_at: new Date() }, include: aiProviderInclude,
      });
      return toAiProvider(row);
    }
  }

  async models(providerParam: string) {
    const provider = this.check(providerParam);
    const row = await this.prisma.aiProvider.findUnique({ where: { provider } });
    if (!row) throw new NotFoundException(`${PROVIDER_INFO[provider].name} belum terhubung`);
    return row.models;
  }

  async disconnect(user: JwtPayload, providerParam: string) {
    const provider = this.check(providerParam);
    const row = await this.prisma.aiProvider.findUnique({ where: { provider } });
    if (!row) throw new NotFoundException(`${PROVIDER_INFO[provider].name} belum terhubung`);
    const used = await this.prisma.agentProfile.count({ where: { provider, user: { deleted_at: null } } });
    if (used) throw new ConflictException(`${used} agent masih memakai ${PROVIDER_INFO[provider].name}. Pindahkan ke model lain dulu.`);
    await this.prisma.aiProvider.delete({ where: { provider } });
    await this.audit.log(user.userId, 'memutuskan penyedia AI', PROVIDER_INFO[provider].name, 'agent');
    return { deleted: true };
  }

  /** Untuk runtime agent: kredensial terdekripsi. Jangan pernah dikirim ke klien. */
  async credentials(provider: AiProviderId): Promise<ProviderCredentials> {
    const row = await this.prisma.aiProvider.findUnique({ where: { provider } });
    if (!row) throw new NotFoundException(`${PROVIDER_INFO[provider].name} belum terhubung`);
    return { provider, apiKey: row.api_key_enc ? SecretBox.open(row.api_key_enc) : undefined, baseUrl: row.base_url ?? undefined };
  }

  /** Pastikan agent memakai penyedia yang terhubung dan model yang dikenal (atau diketik manual). */
  async assertUsable(providerParam: string, modelId: string) {
    const provider = this.check(providerParam);
    const row = await this.prisma.aiProvider.findUnique({ where: { provider } });
    if (!row || row.status !== 'terhubung') throw new BadRequestException(`${PROVIDER_INFO[provider].name} belum terhubung. Hubungkan di Pengaturan → Penyedia AI.`);
    if (!modelId.trim()) throw new BadRequestException('Model wajib diisi');
    return provider;
  }

  /** Panggil model agent. Galat penyedia diteruskan sebagai 400 dengan pesan yang jelas. */
  async chat(provider: string, model: string, system: string, prompt: string, maxTokens?: number) {
    const creds = await this.credentials(this.check(provider));
    try {
      return await chat(creds, model, system, prompt, maxTokens);
    } catch (e) {
      throw new BadRequestException(e instanceof ProviderError ? `${PROVIDER_INFO[creds.provider].name}: ${e.message}` : 'Model gagal menjawab');
    }
  }
}
