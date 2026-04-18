-- Add optional BOM reference to sales order lines
ALTER TABLE sales_order_lines
  ADD COLUMN IF NOT EXISTS bom_id UUID REFERENCES boms(id);
