-- ================================================================
-- Vérification QR code des bulletins signés
--
-- Ajoute un code de vérification unique à chaque bulletin signé par
-- la Direction, plus une "photo" (moyenne + décision) prise au moment
-- de la signature. Le PDF du bulletin imprime un QR code qui pointe
-- vers /verifier-bulletin.html?code=... — n'importe qui (employeur,
-- autre établissement...) peut alors vérifier que le document papier
-- correspond bien à un bulletin réellement signé par la Direction, et
-- si les notes ont été modifiées après coup.
-- ================================================================
ALTER TABLE pedagogie.bulletins_signes
    ADD COLUMN IF NOT EXISTS code_verification VARCHAR(16) UNIQUE,
    ADD COLUMN IF NOT EXISTS moyenne_signee     NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS decision_signee    VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_bulletins_signes_code ON pedagogie.bulletins_signes(code_verification);

SELECT 'Colonnes de vérification QR ajoutées à pedagogie.bulletins_signes ✅' AS statut;
