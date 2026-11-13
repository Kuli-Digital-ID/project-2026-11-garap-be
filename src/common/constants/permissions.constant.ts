export const PERMISSIONS = {
  // Akun & hak akses
  USER: {
    VIEW: 'VIEW_USER',
    ADD: 'ADD_USER',
    UPDATE: 'UPDATE_USER',
    DELETE: 'DELETE_USER',
    MANAGE_PERMISSION: 'MANAGE_USER_PERMISSION',
    CHANGE_POSITION: 'CHANGE_USER_POSITION',
  },
  POSITION: {
    VIEW: 'VIEW_POSITION',
    ADD: 'ADD_POSITION',
    UPDATE: 'UPDATE_POSITION',
    DELETE: 'DELETE_POSITION',
  },
  PERMISSION: {
    VIEW: 'VIEW_PERMISSION',
    ADD: 'ADD_PERMISSION',
    UPDATE: 'UPDATE_PERMISSION',
    DELETE: 'DELETE_PERMISSION',
  },

  // Organisasi
  DIVISION: {
    VIEW: 'VIEW_DIVISION',
    ADD: 'ADD_DIVISION',
    UPDATE: 'UPDATE_DIVISION',
    DELETE: 'DELETE_DIVISION',
  },
  AGENT: {
    VIEW: 'VIEW_AGENT',
    MANAGE: 'MANAGE_AGENT',
  },

  // Proyek & tiket
  PROJECT: {
    VIEW: 'VIEW_PROJECT',
    ADD: 'ADD_PROJECT',
    UPDATE: 'UPDATE_PROJECT',
    DELETE: 'DELETE_PROJECT',
    MANAGE_MEMBER: 'MANAGE_PROJECT_MEMBER',
    MANAGE_WORKFLOW: 'MANAGE_PROJECT_WORKFLOW',
    MANAGE_SPRINT: 'MANAGE_PROJECT_SPRINT',
  },
  TICKET: {
    VIEW: 'VIEW_TICKET',
    ADD: 'ADD_TICKET',
    UPDATE: 'UPDATE_TICKET',
    DELETE: 'DELETE_TICKET',
    COMMENT: 'COMMENT_TICKET',
  },
  REQUEST: {
    VIEW: 'VIEW_REQUEST',
    ADD: 'ADD_REQUEST',
    PROCESS: 'PROCESS_REQUEST',
  },
  DOC: {
    VIEW: 'VIEW_DOC',
    ADD: 'ADD_DOC',
    UPDATE: 'UPDATE_DOC',
    DELETE: 'DELETE_DOC',
    REVIEW: 'REVIEW_DOC',
  },
  APPROVAL: {
    VIEW: 'VIEW_APPROVAL',
    DECIDE: 'DECIDE_APPROVAL',
  },
  AUDIT: {
    VIEW: 'VIEW_AUDIT',
  },

  // Konten & media sosial
  SOCIAL: {
    VIEW: 'VIEW_SOCIAL',
    MANAGE: 'MANAGE_SOCIAL',
  },
  CONTENT: {
    /** Menyetujui & menayangkan postingan (lead proyek selalu boleh). */
    PUBLISH: 'PUBLISH_CONTENT',
  },
} as const;

/** Hak akses bawaan per posisi. Owner selalu mendapat semua izin. */
export const POSITION_NAMES = ['Owner', 'Admin', 'Anggota', 'Tamu', 'Agent'] as const;
export type PositionName = (typeof POSITION_NAMES)[number];

const P = PERMISSIONS;
export const DEFAULT_POSITION_PERMISSIONS: Record<Exclude<PositionName, 'Owner'>, string[]> = {
  Admin: [
    ...Object.values(P.USER),
    P.POSITION.VIEW,
    P.PERMISSION.VIEW,
    ...Object.values(P.DIVISION),
    ...Object.values(P.AGENT),
    ...Object.values(P.PROJECT),
    ...Object.values(P.TICKET),
    ...Object.values(P.REQUEST),
    ...Object.values(P.DOC),
    ...Object.values(P.APPROVAL),
    P.AUDIT.VIEW,
    ...Object.values(P.SOCIAL),
    P.CONTENT.PUBLISH,
  ],
  // Anggota hanya mengerjakan tiket yang ada dan mengubah data dirinya sendiri.
  Anggota: [
    P.USER.VIEW,
    P.DIVISION.VIEW,
    P.AGENT.VIEW,
    P.PROJECT.VIEW,
    P.TICKET.VIEW,
    P.TICKET.UPDATE,
    P.TICKET.COMMENT,
    P.DOC.VIEW,
  ],
  Tamu: [P.USER.VIEW, P.PROJECT.VIEW, P.TICKET.VIEW, P.TICKET.COMMENT, P.DOC.VIEW],
  Agent: [
    P.USER.VIEW,
    P.DIVISION.VIEW,
    P.PROJECT.VIEW,
    P.TICKET.VIEW,
    P.TICKET.ADD,
    P.TICKET.UPDATE,
    P.TICKET.COMMENT,
    P.REQUEST.VIEW,
    P.DOC.VIEW,
    P.DOC.ADD,
    P.DOC.UPDATE,
  ],
};
