
CREATE TABLE IF NOT EXISTS etats (
    code        VARCHAR(2)  PRIMARY KEY,
    libelle     VARCHAR(20) NOT NULL,
    rang        SMALLINT    NOT NULL UNIQUE,
    description TEXT        NOT NULL
);

INSERT INTO etats (code, libelle, rang, description) VALUES
    ('MT', 'Neuve',          1, 'Parfaite, comme sortie du booster'),
    ('NM', 'Quasi neuve',    2, 'Traces visibles seulement de près'),
    ('EX', 'Excellent état', 3, 'Légère usure des coins ou des bords'),
    ('GD', 'Bon état',       4, 'Traces de jeu nettes, sans dommage sérieux'),
    ('LP', 'Usée',           5, 'Usure visible, rayures, légère décoloration'),
    ('PL', 'Très usée',      6, 'Forte usure, plis ou bords abîmés'),
    ('PO', 'Abîmée',         7, 'Déchirure, tache ou inscription')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle, description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS exemplaires (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code_carte    VARCHAR(12)   NOT NULL,
    version       VARCHAR(60)   NOT NULL DEFAULT 'Standard',
    etat          VARCHAR(2)    NOT NULL REFERENCES etats (code),
    langue        VARCHAR(2)    NOT NULL CHECK (langue IN ('FR', 'EN', 'JP')),
    quantite      SMALLINT      NOT NULL DEFAULT 1 CHECK (quantite BETWEEN 1 AND 99),
    prix_unitaire NUMERIC(10,2) NOT NULL CHECK (prix_unitaire >= 0),
    image_url     TEXT,
    ajoute_le     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exemplaires_code_carte_idx ON exemplaires (code_carte);

CREATE TABLE IF NOT EXISTS ouvertures (
    id UUID PRIMARY KEY,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS virtuelles (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ouverture_id UUID NOT NULL REFERENCES ouvertures(id),
    code_carte VARCHAR(12) NOT NULL
);
CREATE INDEX IF NOT EXISTS virtuelles_ouverture ON virtuelles(ouverture_id);

CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(24) NOT NULL,
    mot_de_passe TEXT NOT NULL,
    pieces INTEGER NOT NULL DEFAULT 0 CHECK (pieces BETWEEN 0 AND 1000000000),
    niveau_canon INTEGER NOT NULL DEFAULT 0 CHECK (niveau_canon BETWEEN 0 AND 15),
    niveau_equipage INTEGER NOT NULL DEFAULT 0 CHECK (niveau_equipage BETWEEN 0 AND 15),
    energie DOUBLE PRECISION NOT NULL DEFAULT 20,
    energie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    recolte_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    clics_total BIGINT NOT NULL DEFAULT 0,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS utilisateurs_nom ON utilisateurs(lower(nom));

CREATE TABLE IF NOT EXISTS sessions (
    jeton TEXT PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    expire_le TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days'
);
CREATE INDEX IF NOT EXISTS sessions_expiration ON sessions(expire_le);

ALTER TABLE exemplaires ADD COLUMN IF NOT EXISTS utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE;
ALTER TABLE ouvertures ADD COLUMN IF NOT EXISTS utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE;
ALTER TABLE ouvertures ADD COLUMN IF NOT EXISTS edition VARCHAR(8) NOT NULL DEFAULT 'OP01';
CREATE INDEX IF NOT EXISTS exemplaires_utilisateur ON exemplaires(utilisateur_id);
CREATE INDEX IF NOT EXISTS ouvertures_utilisateur ON ouvertures(utilisateur_id);
