-- =============================================================================
-- Pizza Planet — Operational Data Layer & Menu Seed Migration
-- File    : 003_seed_menu.sql
-- Target  : PostgreSQL 16 / Supabase Cloud
-- Purpose : Populates authoritative store pricing, menu categories, signature
--           products, size variants, and customization options.
-- =============================================================================

DO $$
DECLARE
  -- 1. Category UUIDs
  v_cat_signature   uuid := '11111111-0000-0000-0000-000000000001';
  v_cat_classic     uuid := '11111111-0000-0000-0000-000000000002';
  v_cat_sides       uuid := '11111111-0000-0000-0000-000000000003';
  v_cat_beverages   uuid := '11111111-0000-0000-0000-000000000004';

  -- 2. Product UUIDs
  v_prod_margherita    uuid := '33330001-0000-0000-0000-000000000001';
  v_prod_pepperoni     uuid := '33330001-0000-0000-0000-000000000002';
  v_prod_truffle       uuid := '33330001-0000-0000-0000-000000000003';
  v_prod_garlic_bread  uuid := '33330001-0000-0000-0000-000000000004';
  v_prod_cheese_sticks uuid := '33330001-0000-0000-0000-000000000005';
  v_prod_cola          uuid := '33330001-0000-0000-0000-000000000006';
  v_prod_iced_tea      uuid := '33330001-0000-0000-0000-000000000007';

  -- 3. Product Variant UUIDs
  -- Margherita Variants
  v_var_mar_s   uuid := '44440001-0001-0000-0000-000000000001';
  v_var_mar_m   uuid := '44440001-0001-0000-0000-000000000002';
  v_var_mar_l   uuid := '44440001-0001-0000-0000-000000000003';
  v_var_mar_p   uuid := '44440001-0001-0000-0000-000000000004';
  -- Hot Honey Pepperoni Variants
  v_var_pep_s   uuid := '44440001-0002-0000-0000-000000000001';
  v_var_pep_m   uuid := '44440001-0002-0000-0000-000000000002';
  v_var_pep_l   uuid := '44440001-0002-0000-0000-000000000003';
  v_var_pep_p   uuid := '44440001-0002-0000-0000-000000000004';
  -- Truffle Fungi Bianca Variants
  v_var_tru_s   uuid := '44440001-0003-0000-0000-000000000001';
  v_var_tru_m   uuid := '44440001-0003-0000-0000-000000000002';
  v_var_tru_l   uuid := '44440001-0003-0000-0000-000000000003';
  v_var_tru_p   uuid := '44440001-0003-0000-0000-000000000004';
  -- Galactic Garlic Bread Variants
  v_var_gar_reg uuid := '44440001-0004-0000-0000-000000000001';
  v_var_gar_lrg uuid := '44440001-0004-0000-0000-000000000002';
  -- Meteorite Cheese Sticks Variants
  v_var_chs_6   uuid := '44440001-0005-0000-0000-000000000001';
  v_var_chs_12  uuid := '44440001-0005-0000-0000-000000000002';
  -- Supernova Cola Variants
  v_var_col_can uuid := '44440001-0006-0000-0000-000000000001';
  v_var_col_bot uuid := '44440001-0006-0000-0000-000000000002';
  -- Nebula Iced Tea Variants
  v_var_tea_pch uuid := '44440001-0007-0000-0000-000000000001';
  v_var_tea_lmn uuid := '44440001-0007-0000-0000-000000000002';

  -- 4. Customization Option UUIDs — Crusts
  v_opt_crust_thin   uuid := '22220001-0000-0000-0000-000000000001';
  v_opt_crust_tossed uuid := '22220001-0000-0000-0000-000000000002';
  v_opt_crust_burst  uuid := '22220001-0000-0000-0000-000000000003';
  v_opt_crust_wheat  uuid := '22220001-0000-0000-0000-000000000004';

  -- 5. Customization Option UUIDs — Sauces
  v_opt_sauce_tomato  uuid := '22220002-0000-0000-0000-000000000001';
  v_opt_sauce_peri    uuid := '22220002-0000-0000-0000-000000000002';
  v_opt_sauce_bbq     uuid := '22220002-0000-0000-0000-000000000003';
  v_opt_sauce_garlic  uuid := '22220002-0000-0000-0000-000000000004';
  v_opt_sauce_pesto   uuid := '22220002-0000-0000-0000-000000000005';
  v_opt_sauce_truffle uuid := '22220002-0000-0000-0000-000000000006';

  -- 6. Customization Option UUIDs — Toppings (Veg)
  v_opt_top_mozzarella  uuid := '22220003-0000-0000-0000-000000000001';
  v_opt_top_basil       uuid := '22220003-0000-0000-0000-000000000002';
  v_opt_top_mushrooms   uuid := '22220003-0000-0000-0000-000000000003';
  v_opt_top_peppers     uuid := '22220003-0000-0000-0000-000000000004';
  v_opt_top_jalapenos   uuid := '22220003-0000-0000-0000-000000000005';
  v_opt_top_olives      uuid := '22220003-0000-0000-0000-000000000006';
  v_opt_top_onions      uuid := '22220003-0000-0000-0000-000000000007';
  v_opt_top_tomatoes    uuid := '22220003-0000-0000-0000-000000000008';
  v_opt_top_spinach     uuid := '22220003-0000-0000-0000-000000000009';
  v_opt_top_truffle_oil uuid := '22220003-0000-0000-0000-000000000010';
  v_opt_top_hot_honey   uuid := '22220003-0000-0000-0000-000000000011';
  v_opt_top_ricotta     uuid := '22220003-0000-0000-0000-000000000012';
  v_opt_top_extra_cheese uuid := '22220003-0000-0000-0000-000000000013';

  -- 7. Customization Option UUIDs — Toppings (Non-Veg)
  v_opt_top_pepperoni   uuid := '22220003-0000-0000-0000-000000000020';
  v_opt_top_chicken     uuid := '22220003-0000-0000-0000-000000000021';
  v_opt_top_bacon       uuid := '22220003-0000-0000-0000-000000000022';

  -- 8. Customization Option UUIDs — Sizes
  v_opt_size_s uuid := '22220004-0000-0000-0000-000000000001';
  v_opt_size_m uuid := '22220004-0000-0000-0000-000000000002';
  v_opt_size_l uuid := '22220004-0000-0000-0000-000000000003';
  v_opt_size_p uuid := '22220004-0000-0000-0000-000000000004';
BEGIN
  -- ===========================================================================
  -- STEP 1: STORE SETTINGS (Authoritative Singleton Rule: id = 1)
  -- ===========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.store_settings WHERE id = 1) THEN
    INSERT INTO public.store_settings (
      id, store_name, tagline, is_open, delivery_radius_km, delivery_fee,
      free_delivery_threshold, tax_rate_percent, cod_max_order_amount, currency,
      currency_symbol, support_phone, whatsapp_number, support_email
    ) VALUES (
      1, 'Pizza Planet', 'Out of this world pizza.', true, 5, 4900,
      49900, 5.00, 50000, 'INR', '₹', '+91 98765 43210',
      '+91 98765 43210', 'orders@pizzaplanet.in'
    );
  ELSE
    UPDATE public.store_settings SET
      store_name              = 'Pizza Planet',
      tagline                 = 'Out of this world pizza.',
      is_open                 = true,
      delivery_radius_km      = 5,
      delivery_fee            = 4900,
      free_delivery_threshold = 49900,
      tax_rate_percent        = 5.00,
      cod_max_order_amount    = 50000,
      currency                = 'INR',
      currency_symbol         = '₹',
      support_phone           = '+91 98765 43210',
      whatsapp_number         = '+91 98765 43210',
      support_email           = 'orders@pizzaplanet.in'
    WHERE id = 1;
  END IF;

  -- ===========================================================================
  -- STEP 2: MENU CATEGORIES
  -- ===========================================================================
  INSERT INTO public.categories (id, slug, name, display_order, is_archived)
  VALUES
    (v_cat_signature, 'signature-pizzas', 'Signature Pizzas', 1, false),
    (v_cat_classic,   'classic-pizzas',   'Classic Pizzas',   2, false),
    (v_cat_sides,     'sides',            'Sides',            3, false),
    (v_cat_beverages, 'beverages',        'Beverages',        4, false)
  ON CONFLICT (id) DO UPDATE SET
    slug          = EXCLUDED.slug,
    name          = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_archived   = EXCLUDED.is_archived;

  -- ===========================================================================
  -- STEP 3: CUSTOMIZATION OPTIONS (Crusts, Sauces, Toppings, Sizes)
  -- ===========================================================================
  INSERT INTO public.customization_options (id, type, name, price, is_veg, is_available, display_order)
  VALUES
    -- Crusts
    (v_opt_crust_thin,   'crust', 'Thin Crust',          0,    true, true, 1),
    (v_opt_crust_tossed, 'crust', 'Classic Hand-Tossed', 0,    true, true, 2),
    (v_opt_crust_burst,  'crust', 'Cheese-Burst',        7900, true, true, 3),
    (v_opt_crust_wheat,  'crust', 'Whole Wheat',         0,    true, true, 4),
    -- Sauces
    (v_opt_sauce_tomato,  'sauce', 'Classic Tomato', 0,    true, true, 1),
    (v_opt_sauce_peri,    'sauce', 'Peri-Peri',      0,    true, true, 2),
    (v_opt_sauce_bbq,     'sauce', 'BBQ',            0,    true, true, 3),
    (v_opt_sauce_garlic,  'sauce', 'White Garlic',   0,    true, true, 4),
    (v_opt_sauce_pesto,   'sauce', 'Pesto',          2900, true, true, 5),
    (v_opt_sauce_truffle, 'sauce', 'Truffle Cream',  4900, true, true, 6),
    -- Toppings Veg
    (v_opt_top_mozzarella,   'topping', 'Mozzarella',          0,    true, true, 1),
    (v_opt_top_basil,        'topping', 'Fresh Basil',         0,    true, true, 2),
    (v_opt_top_mushrooms,    'topping', 'Mushrooms',           2900, true, true, 3),
    (v_opt_top_peppers,      'topping', 'Bell Peppers',        1900, true, true, 4),
    (v_opt_top_jalapenos,    'topping', 'Jalapeños',           1900, true, true, 5),
    (v_opt_top_olives,       'topping', 'Black Olives',        1900, true, true, 6),
    (v_opt_top_onions,       'topping', 'Red Onions',          1500, true, true, 7),
    (v_opt_top_tomatoes,     'topping', 'Cherry Tomatoes',     1900, true, true, 8),
    (v_opt_top_spinach,      'topping', 'Spinach',             1900, true, true, 9),
    (v_opt_top_truffle_oil,  'topping', 'Truffle Oil Drizzle', 4900, true, true, 10),
    (v_opt_top_hot_honey,    'topping', 'Hot Honey',           3900, true, true, 11),
    (v_opt_top_ricotta,      'topping', 'Ricotta Dollops',     3900, true, true, 12),
    (v_opt_top_extra_cheese, 'topping', 'Extra Cheese',        3900, true, true, 13),
    -- Toppings Non-Veg
    (v_opt_top_pepperoni,    'topping', 'Pepperoni',       3900, false, true, 20),
    (v_opt_top_chicken,      'topping', 'Grilled Chicken', 3900, false, true, 21),
    (v_opt_top_bacon,        'topping', 'Bacon Crumbles',  4900, false, true, 22),
    -- Sizes
    (v_opt_size_s, 'size', 'Small (7")',   0, true, true, 1),
    (v_opt_size_m, 'size', 'Medium (10")', 0, true, true, 2),
    (v_opt_size_l, 'size', 'Large (12")',  0, true, true, 3),
    (v_opt_size_p, 'size', 'Party (16")',  0, true, true, 4)
  ON CONFLICT (id) DO UPDATE SET
    type          = EXCLUDED.type,
    name          = EXCLUDED.name,
    price         = EXCLUDED.price,
    is_veg        = EXCLUDED.is_veg,
    is_available  = EXCLUDED.is_available,
    display_order = EXCLUDED.display_order;

  -- ===========================================================================
  -- STEP 4: PRODUCTS
  -- ===========================================================================
  INSERT INTO public.products (id, category_id, name, description, base_price, image_url, is_veg, is_available, is_archived, display_order)
  VALUES
    (v_prod_margherita,    v_cat_classic,   'Margherita Classico',    'San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil, and a drizzle of extra virgin olive oil on a hand-tossed crust. Timeless for a reason.', 24900, '/images/menu/margherita_classico.png', true,  true, false, 1),
    (v_prod_pepperoni,     v_cat_signature, 'Hot Honey Pepperoni',    'Cupped pepperoni crisped to the edges, pooled in their own spice, hit with a finishing drizzle of artisan hot honey. Sweet. Smoky. Absolutely savage.', 31900, '/images/menu/hot_honey_pepperoni.png', false, true, false, 1),
    (v_prod_truffle,       v_cat_signature, 'Truffle Fungi Bianca',   'White garlic cream base, wild mushroom medley, ricotta dollops, aged parmesan, finished with black truffle oil. No tomato. No apologies.', 37900, '/images/menu/truffle_fungi_bianca.png', true,  true, false, 2),
    (v_prod_garlic_bread,  v_cat_sides,     'Galactic Garlic Bread',  'Crispy French baguette slices topped with garlic butter, Italian herbs, and melted mozzarella cheese.', 14900, '/images/menu/galactic_garlic_bread.png', true,  true, false, 1),
    (v_prod_cheese_sticks, v_cat_sides,     'Meteorite Cheese Sticks','Oven-baked dough sticks stuffed with gooey mozzarella and parmesan, served with spicy marinara dip.', 17900, '/images/menu/meteorite_cheese_sticks.png', true,  true, false, 2),
    (v_prod_cola,          v_cat_beverages, 'Supernova Cola',         '330ml chilled fizzy cola with a refreshing citrus kick. Truly out of this world.', 6900,  null, true,  true, false, 1),
    (v_prod_iced_tea,      v_cat_beverages, 'Nebula Iced Tea',        'Freshly brewed peach iced tea infused with fresh mint and lemon.', 8900,  null, true,  true, false, 2)
  ON CONFLICT (id) DO UPDATE SET
    category_id   = EXCLUDED.category_id,
    name          = EXCLUDED.name,
    description   = EXCLUDED.description,
    base_price    = EXCLUDED.base_price,
    image_url     = EXCLUDED.image_url,
    is_veg        = EXCLUDED.is_veg,
    is_available  = EXCLUDED.is_available,
    is_archived   = EXCLUDED.is_archived,
    display_order = EXCLUDED.display_order;

  -- ===========================================================================
  -- STEP 5: PRODUCT VARIANTS (Size Tiers / Configurations)
  -- ===========================================================================
  INSERT INTO public.product_variants (id, product_id, size_name, size_label, price_adjustment, display_order)
  VALUES
    -- Margherita Classico Variants
    (v_var_mar_s, v_prod_margherita, 'Small',  '7"',   0,     1),
    (v_var_mar_m, v_prod_margherita, 'Medium', '10"',  7000,  2),
    (v_var_mar_l, v_prod_margherita, 'Large',  '12"',  12000, 3),
    (v_var_mar_p, v_prod_margherita, 'Party',  '16"',  22000, 4),
    -- Hot Honey Pepperoni Variants
    (v_var_pep_s, v_prod_pepperoni,  'Small',  '7"',   0,     1),
    (v_var_pep_m, v_prod_pepperoni,  'Medium', '10"',  8000,  2),
    (v_var_pep_l, v_prod_pepperoni,  'Large',  '12"',  14000, 3),
    (v_var_pep_p, v_prod_pepperoni,  'Party',  '16"',  25000, 4),
    -- Truffle Fungi Bianca Variants
    (v_var_tru_s, v_prod_truffle,    'Small',  '7"',   0,     1),
    (v_var_tru_m, v_prod_truffle,    'Medium', '10"',  9000,  2),
    (v_var_tru_l, v_prod_truffle,    'Large',  '12"',  16000, 3),
    (v_var_tru_p, v_prod_truffle,    'Party',  '16"',  28000, 4),
    -- Galactic Garlic Bread Variants
    (v_var_gar_reg, v_prod_garlic_bread,  'Regular', '4 Pcs', 0,    1),
    (v_var_gar_lrg, v_prod_garlic_bread,  'Large',   '8 Pcs', 5000, 2),
    -- Meteorite Cheese Sticks Variants
    (v_var_chs_6,   v_prod_cheese_sticks, 'Regular', '6 Pcs',  0,    1),
    (v_var_chs_12,  v_prod_cheese_sticks, 'Large',   '12 Pcs', 9000, 2),
    -- Supernova Cola Variants
    (v_var_col_can, v_prod_cola,          'Can',     '330ml', 0,    1),
    (v_var_col_bot, v_prod_cola,          'Bottle',  '500ml', 3000, 2),
    -- Nebula Iced Tea Variants
    (v_var_tea_pch, v_prod_iced_tea,      'Peach',   '330ml', 0,    1),
    (v_var_tea_lmn, v_prod_iced_tea,      'Lemon',   '330ml', 0,    2)
  ON CONFLICT (id) DO UPDATE SET
    product_id       = EXCLUDED.product_id,
    size_name        = EXCLUDED.size_name,
    size_label       = EXCLUDED.size_label,
    price_adjustment = EXCLUDED.price_adjustment,
    display_order    = EXCLUDED.display_order;

  -- ===========================================================================
  -- STEP 6: PRODUCT CUSTOMIZATIONS (Mapping Options to Products)
  -- ===========================================================================
  INSERT INTO public.product_customizations (product_id, option_id, is_default)
  VALUES
    -- Margherita Classico Customizations
    (v_prod_margherita, v_opt_crust_thin,       false),
    (v_prod_margherita, v_opt_crust_tossed,     true),
    (v_prod_margherita, v_opt_crust_burst,      false),
    (v_prod_margherita, v_opt_crust_wheat,      false),
    (v_prod_margherita, v_opt_sauce_tomato,     true),
    (v_prod_margherita, v_opt_sauce_peri,       false),
    (v_prod_margherita, v_opt_sauce_bbq,        false),
    (v_prod_margherita, v_opt_sauce_garlic,     false),
    (v_prod_margherita, v_opt_sauce_pesto,      false),
    (v_prod_margherita, v_opt_top_mozzarella,   true),
    (v_prod_margherita, v_opt_top_basil,        true),
    (v_prod_margherita, v_opt_top_mushrooms,    false),
    (v_prod_margherita, v_opt_top_peppers,      false),
    (v_prod_margherita, v_opt_top_jalapenos,    false),
    (v_prod_margherita, v_opt_top_olives,       false),
    (v_prod_margherita, v_opt_top_onions,       false),
    (v_prod_margherita, v_opt_top_tomatoes,     false),
    (v_prod_margherita, v_opt_top_spinach,      false),
    (v_prod_margherita, v_opt_top_extra_cheese, false),

    -- Hot Honey Pepperoni Customizations
    (v_prod_pepperoni, v_opt_crust_thin,       false),
    (v_prod_pepperoni, v_opt_crust_tossed,     true),
    (v_prod_pepperoni, v_opt_crust_burst,      false),
    (v_prod_pepperoni, v_opt_crust_wheat,      false),
    (v_prod_pepperoni, v_opt_sauce_tomato,     true),
    (v_prod_pepperoni, v_opt_sauce_peri,       false),
    (v_prod_pepperoni, v_opt_sauce_bbq,        false),
    (v_prod_pepperoni, v_opt_sauce_garlic,     false),
    (v_prod_pepperoni, v_opt_top_mozzarella,   true),
    (v_prod_pepperoni, v_opt_top_jalapenos,    false),
    (v_prod_pepperoni, v_opt_top_hot_honey,    true),
    (v_prod_pepperoni, v_opt_top_peppers,      false),
    (v_prod_pepperoni, v_opt_top_onions,       false),
    (v_prod_pepperoni, v_opt_top_extra_cheese, false),
    (v_prod_pepperoni, v_opt_top_pepperoni,    true),
    (v_prod_pepperoni, v_opt_top_bacon,        false),

    -- Truffle Fungi Bianca Customizations
    (v_prod_truffle, v_opt_crust_thin,       false),
    (v_prod_truffle, v_opt_crust_tossed,     true),
    (v_prod_truffle, v_opt_crust_burst,      false),
    (v_prod_truffle, v_opt_sauce_garlic,     true),
    (v_prod_truffle, v_opt_sauce_truffle,    false),
    (v_prod_truffle, v_opt_sauce_pesto,      false),
    (v_prod_truffle, v_opt_top_mozzarella,   true),
    (v_prod_truffle, v_opt_top_mushrooms,    true),
    (v_prod_truffle, v_opt_top_truffle_oil,  true),
    (v_prod_truffle, v_opt_top_ricotta,      true),
    (v_prod_truffle, v_opt_top_spinach,      false),
    (v_prod_truffle, v_opt_top_onions,       false),
    (v_prod_truffle, v_opt_top_olives,       false),
    (v_prod_truffle, v_opt_top_extra_cheese, false)
  ON CONFLICT (product_id, option_id) DO UPDATE SET
    is_default = EXCLUDED.is_default;

  RAISE NOTICE 'Pizza Planet operational menu seed migration completed successfully.';
END $$;
