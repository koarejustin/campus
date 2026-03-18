-- Table pour persister les messages de la salle des profs
CREATE TABLE IF NOT EXISTS pedagogie.messages_salle (
    id          BIGSERIAL PRIMARY KEY,
    conv_id     VARCHAR(50)  NOT NULL DEFAULT 'general',
    from_code   VARCHAR(30)  NOT NULL,
    from_nom    VARCHAR(100) NOT NULL,
    contenu     TEXT         NOT NULL,
    type_msg    VARCHAR(20)  NOT NULL DEFAULT 'text',
    reply_to    BIGINT       REFERENCES pedagogie.messages_salle(id) ON DELETE SET NULL,
    date_envoi  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON pedagogie.messages_salle(conv_id, date_envoi DESC);
COMMENT ON TABLE pedagogie.messages_salle IS 'Messages en temps réel - Salle des professeurs';
