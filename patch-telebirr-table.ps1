$path = ".\server.js"
$content = [System.IO.File]::ReadAllText((Resolve-Path $path))

$needle = @"
    await pool.query(`
      ALTER TABLE restaurant_payment_settings
"@

$insert = @"
    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurant_payment_branches (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER NOT NULL
          REFERENCES restaurants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        order_now_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        merchant_name TEXT NOT NULL DEFAULT '',
        merchant_code TEXT NOT NULL DEFAULT '',
        merchant_app_id TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (restaurant_id, name)
      )
    `);

    await pool.query(`
      INSERT INTO restaurant_payment_branches (
        restaurant_id, name, order_now_enabled,
        merchant_name, merchant_code, merchant_app_id
      )
      SELECT
        r.id, 'Atlas',
        COALESCE(ps.order_now_enabled, TRUE),
        COALESCE(ps.merchant_name, ''),
        COALESCE(ps.merchant_code, ''),
        COALESCE(ps.merchant_app_id, '')
      FROM restaurants r
      LEFT JOIN restaurant_payment_settings ps
        ON ps.restaurant_id = r.id
      ON CONFLICT (restaurant_id, name) DO NOTHING
    `);

    await pool.query(`
      ALTER TABLE restaurant_payment_settings
"@

if (-not $content.Contains($needle)) {
    throw "Could not find the exact database initialization location. No changes made."
}
$content = $content.Replace($needle, $insert)
[System.IO.File]::WriteAllText(
    (Resolve-Path $path),
    $content,
    [System.Text.UTF8Encoding]::new($false)
)
Write-Host "Branch table initialization added."
