-- Migration: multi-item receipts
-- 1. Drop existing function to change return type
drop function if exists verify_get_receipt(text);

-- 2. Create receipt_items table for line items
create table if not exists receipt_items (
    id uuid primary key default gen_random_uuid(),
    receipt_id uuid not null references business_receipts(id) on delete cascade,
    item_name text not null,
    qty numeric not null default 1,
    unit_price numeric not null default 0,
    vat_rate numeric not null default 0,
    warranty_months int not null default 0,
    net_total numeric not null default 0,
    vat_amount numeric not null default 0,
    gross_total numeric not null default 0,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_receipt_items_receipt_id on receipt_items(receipt_id);

-- 3. Rewrite verify_get_receipt to include items in receipt JSON
create or replace function verify_get_receipt(p_fiscal_hash text)
returns table(found boolean, receipt jsonb, shop jsonb)
language sql
stable
as $$
    select
        true::boolean as found,
        jsonb_set(
            to_jsonb(r),
            '{items}',
            coalesce(
                (
                    select jsonb_agg(
                        jsonb_build_object(
                            'item_name', ri.item_name,
                            'qty', ri.qty,
                            'unit_price', ri.unit_price,
                            'vat_rate', ri.vat_rate,
                            'warranty_months', ri.warranty_months,
                            'net_total', ri.net_total,
                            'vat_amount', ri.vat_amount,
                            'gross_total', ri.gross_total
                        ) order by ri.sort_order
                    )
                    from receipt_items ri
                    where ri.receipt_id = r.id
                ),
                '[]'::jsonb
            )
        ) as receipt,
        to_jsonb(s) as shop
    from business_receipts r
    join shops s on s.id = r.shop_id
    where r.fiscal_hash = p_fiscal_hash
    union all
    select false, null::jsonb, null::jsonb
    where not exists (
        select 1 from business_receipts where fiscal_hash = p_fiscal_hash
    )
    limit 1;
$$;
