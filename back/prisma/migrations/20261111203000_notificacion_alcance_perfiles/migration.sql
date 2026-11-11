-- Alcances de notificación por perfil (campo, transversal, organización).
ALTER TYPE "AlcanceNotificacion" ADD VALUE IF NOT EXISTS 'DIRIGENTES_CAMPO';
ALTER TYPE "AlcanceNotificacion" ADD VALUE IF NOT EXISTS 'TRANSVERSALES';
ALTER TYPE "AlcanceNotificacion" ADD VALUE IF NOT EXISTS 'PERFIL_ORGANIZACION';
