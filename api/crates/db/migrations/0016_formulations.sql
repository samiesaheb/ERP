-- Ingredients master (cosmetics INCI list)
CREATE TABLE ingredients (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(64) NOT NULL UNIQUE,
    inci_name  VARCHAR(255) NOT NULL,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Formulation header (product + version)
CREATE TABLE formulations (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id    UUID    NOT NULL REFERENCES items(id),
    version    INTEGER NOT NULL DEFAULT 1,
    is_active  BOOLEAN NOT NULL DEFAULT FALSE,
    note       TEXT    NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, version)
);

-- Formulation lines (ingredient percentages)
CREATE TABLE formulation_lines (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    formulation_id UUID         NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
    ingredient_id  UUID         NOT NULL REFERENCES ingredients(id),
    percentage     NUMERIC(9,4) NOT NULL,
    phase          VARCHAR(32)  NOT NULL DEFAULT '',
    comment        VARCHAR(255) NOT NULL DEFAULT ''
);
