
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\PC\Desktop\caffemenu'

$serverPath = '.\server.js'
$adminPath = '.\scripts\admin.js'
$htmlPath = '.\admin-panel.html'
$cssPath = '.\stylesheets\admin-panel.css'

$server = Get-Content $serverPath -Raw
$admin = Get-Content $adminPath -Raw
$html = Get-Content $htmlPath -Raw
$css = Get-Content $cssPath -Raw

function Replace-Once {
    param(
        [string]$Text,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    $count = ([regex]::Matches($Text, [regex]::Escape($Old))).Count
    if ($count -ne 1) {
        throw "${Label}: expected exactly one match, found $count. No target files were written."
    }

    return $Text.Replace($Old, $New)
}

# 1. Add branch-only settings columns.
$server = Replace-Once $server @'
      ADD COLUMN IF NOT EXISTS fabric_app_id TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS app_secret_encrypted TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS private_key_encrypted TEXT NOT NULL DEFAULT ''
'@ @'
      ADD COLUMN IF NOT EXISTS fabric_app_id TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS app_secret_encrypted TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS private_key_encrypted TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox',
      ADD COLUMN IF NOT EXISTS notify_url TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS return_url TEXT NOT NULL DEFAULT ''
'@ 'Branch database migration'

# 2. Add environment and URLs to the branch list response.
$server = Replace-Once $server @'
               merchant_code, merchant_app_id, fabric_app_id,
               (COALESCE(app_secret_encrypted, '') <> '') AS has_app_secret,
'@ @'
               merchant_code, merchant_app_id, fabric_app_id,
               environment, notify_url, return_url,
               (COALESCE(app_secret_encrypted, '') <> '') AS has_app_secret,
'@ 'Branch list response'

# 3. Validate and save branch-only settings.
$server = Replace-Once $server @'
        fabric_app_id = '',
        app_secret = '',
        private_key = ''
      } = req.body || {};
'@ @'
        fabric_app_id = '',
        app_secret = '',
        private_key = '',
        environment = 'sandbox',
        notify_url = '',
        return_url = ''
      } = req.body || {};
'@ 'Branch request fields'

$server = Replace-Once $server @'
        typeof fabric_app_id !== 'string' ||
        typeof app_secret !== 'string' ||
        typeof private_key !== 'string' ||
        merchant_name.length > 200 ||
        merchant_code.length > 200 ||
        merchant_app_id.length > 200 ||
        fabric_app_id.length > 500 ||
        app_secret.length > 5000 ||
        private_key.length > 20000
'@ @'
        typeof fabric_app_id !== 'string' ||
        typeof app_secret !== 'string' ||
        typeof private_key !== 'string' ||
        typeof environment !== 'string' ||
        typeof notify_url !== 'string' ||
        typeof return_url !== 'string' ||
        !['sandbox', 'production'].includes(environment) ||
        merchant_name.length > 200 ||
        merchant_code.length > 200 ||
        merchant_app_id.length > 200 ||
        fabric_app_id.length > 500 ||
        app_secret.length > 5000 ||
        private_key.length > 20000 ||
        notify_url.length > 2000 ||
        return_url.length > 2000
'@ 'Branch request validation'

$server = Replace-Once $server @'
            private_key_encrypted = CASE
              WHEN $7 <> '' THEN $7 ELSE private_key_encrypted
            END,
            updated_at = NOW()
        WHERE id = $8 AND restaurant_id = $9
        RETURNING id, name, order_now_enabled, merchant_name,
                  merchant_code, merchant_app_id, fabric_app_id,
                  (COALESCE(app_secret_encrypted, '') <> '') AS has_app_secret,
                  (COALESCE(private_key_encrypted, '') <> '') AS has_private_key,
                  created_at, updated_at
      `, [
        order_now_enabled,
        merchant_name.trim(),
        merchant_code.trim(),
        merchant_app_id.trim(),
        fabric_app_id.trim(),
        encryptedAppSecret,
        encryptedPrivateKey,
        branchId,
        restaurant.id
      ]);
'@ @'
            private_key_encrypted = CASE
              WHEN $7 <> '' THEN $7 ELSE private_key_encrypted
            END,
            environment = $8,
            notify_url = $9,
            return_url = $10,
            updated_at = NOW()
        WHERE id = $11 AND restaurant_id = $12
        RETURNING id, name, order_now_enabled, merchant_name,
                  merchant_code, merchant_app_id, fabric_app_id,
                  environment, notify_url, return_url,
                  (COALESCE(app_secret_encrypted, '') <> '') AS has_app_secret,
                  (COALESCE(private_key_encrypted, '') <> '') AS has_private_key,
                  created_at, updated_at
      `, [
        order_now_enabled,
        merchant_name.trim(),
        merchant_code.trim(),
        merchant_app_id.trim(),
        fabric_app_id.trim(),
        encryptedAppSecret,
        encryptedPrivateKey,
        environment,
        notify_url.trim(),
        return_url.trim(),
        branchId,
        restaurant.id
      ]);
'@ 'Branch update query'

# 4. Add a protected detail route for one branch.
# It is inserted before the existing PUT route; it does not change POST/DELETE.
$detailRoute = @'
app.get(
  '/api/admin/payment-branches/:slug/:branchId',
  requireRestaurantAdmin,
  async (req, res) => {
    res.set('Cache-Control', 'no-store');

    try {
      const restaurant = await getPaymentBranchRestaurant(req, res);
      if (!restaurant) return;

      const branchId = Number(req.params.branchId);
      if (!Number.isInteger(branchId) || branchId < 1) {
        return res.status(400).json({ ok: false, message: 'Invalid branch ID.' });
      }

      const result = await pool.query(`
        SELECT id, name, order_now_enabled, merchant_name, merchant_code,
               merchant_app_id, fabric_app_id, environment, notify_url, return_url,
               app_secret_encrypted, private_key_encrypted
        FROM restaurant_payment_branches
        WHERE id = $1 AND restaurant_id = $2
        LIMIT 1
      `, [branchId, restaurant.id]);

      if (!result.rows.length) {
        return res.status(404).json({ ok: false, message: 'Payment branch not found.' });
      }

      const row = result.rows[0];
      return res.json({
        ok: true,
        branch: {
          id: row.id,
          name: row.name,
          order_now_enabled: row.order_now_enabled,
          merchant_name: row.merchant_name,
          merchant_code: row.merchant_code,
          merchant_app_id: row.merchant_app_id,
          fabric_app_id: row.fabric_app_id,
          environment: row.environment,
          notify_url: row.notify_url,
          return_url: row.return_url,
          has_app_secret: Boolean(row.app_secret_encrypted),
          has_private_key: Boolean(row.private_key_encrypted),
          app_secret: decryptTelebirrSecret(row.app_secret_encrypted),
          private_key: decryptTelebirrSecret(row.private_key_encrypted)
        }
      });
    } catch (error) {
      console.error('[payment-branches:details] Error:', error);
      return res.status(500).json({
        ok: false,
        message: 'Unable to load branch settings.'
      });
    }
  }
);

'@

if ($server.Contains("  '/api/admin/payment-branches/:slug/:branchId',`r`n  requireRestaurantAdmin,`r`n  async (req, res) => {")) {
    throw 'Unexpected route shape; stopping without writing.'
}

$putMarker = @'
app.put(
  '/api/admin/payment-branches/:slug/:branchId',
'@
$server = Replace-Once $server $putMarker ($detailRoute + $putMarker) 'Insert branch details route'

# 5. Add Show/Hide buttons to the two credential fields.
$html = Replace-Once $html @'
                        <input type="password" id="telebirrAppSecret" name="app_secret" maxlength="5000" autocomplete="new-password">
'@ @'
                        <div class="telebirr-secret-control">
                            <input type="password" id="telebirrAppSecret" name="app_secret" maxlength="5000" autocomplete="new-password">
                            <button type="button" class="telebirr-secret-toggle" data-toggle-target="telebirrAppSecret" aria-pressed="false">Show</button>
                        </div>
'@ 'App Secret field'

$html = Replace-Once $html @'
                        <textarea id="telebirrPrivateKey" name="private_key" rows="5" maxlength="20000" autocomplete="off" spellcheck="false"></textarea>
'@ @'
                        <div class="telebirr-secret-control telebirr-private-key-control">
                            <textarea id="telebirrPrivateKey" name="private_key" rows="5" maxlength="20000" autocomplete="off" spellcheck="false" class="telebirr-secret-masked"></textarea>
                            <button type="button" class="telebirr-secret-toggle" data-toggle-target="telebirrPrivateKey" aria-pressed="false">Show</button>
                        </div>
'@ 'Private Key field'

# 6. Include branch environment and URLs in the save request.
$admin = Replace-Once $admin @'
        payload.private_key =
            document.getElementById('telebirrPrivateKey').value;
    }

    const url = branchId
'@ @'
        payload.private_key =
            document.getElementById('telebirrPrivateKey').value;
        payload.environment =
            document.getElementById('telebirrEnvironment').value;
        payload.notify_url =
            document.getElementById('telebirrNotifyUrl').value.trim();
        payload.return_url =
            document.getElementById('telebirrReturnUrl').value.trim();
    }

    const url = branchId
'@ 'Branch save payload'

# 7. Clear secrets after successful save for both branch and restaurant forms.
$admin = Replace-Once $admin @'
        if (!branchId) {
            const appSecret = document.getElementById('telebirrAppSecret');
'@ @'
        {
            const appSecret = document.getElementById('telebirrAppSecret');
'@ 'Clear saved credentials'

# 8. Load stored branch values after opening its details.
$admin = Replace-Once $admin @'
    branchPrivateKey.placeholder = branch.has_private_key
        ? 'Saved securely - leave blank to keep current value'
        : 'Paste Private Key (PEM)';

    const branchRow = button.closest('.profile-entry');
'@ @'
    branchPrivateKey.placeholder = branch.has_private_key
        ? 'Saved credential — leave blank to keep current value'
        : 'Paste Private Key (PEM)';

    document.getElementById('telebirrEnvironment').value =
        branch.environment || 'sandbox';
    document.getElementById('telebirrNotifyUrl').value =
        branch.notify_url || '';
    document.getElementById('telebirrReturnUrl').value =
        branch.return_url || '';

    fetch(
        '/api/admin/payment-branches/' +
            encodeURIComponent(currentRestaurant.slug) + '/' +
            encodeURIComponent(branch.id),
        { credentials: 'same-origin', cache: 'no-store' }
    ).then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) {
            throw new Error(data.message || 'Unable to load branch settings.');
        }
        if (settingsForm.dataset.branchId !== String(branch.id)) return;

        const saved = data.branch;
        document.getElementById('telebirrEnvironment').value =
            saved.environment || 'sandbox';
        document.getElementById('telebirrNotifyUrl').value =
            saved.notify_url || '';
        document.getElementById('telebirrReturnUrl').value =
            saved.return_url || '';
        branchAppSecret.value = saved.app_secret || '';
        branchPrivateKey.value = saved.private_key || '';
    }).catch((error) => {
        console.error('[telebirr] Branch details load failed:', error);
        const status = document.getElementById('telebirrSettingsMessage');
        if (status) status.textContent = error.message;
    });

    const branchRow = button.closest('.profile-entry');
'@ 'Branch details loading'

# 9. Toggle visibility for credentials.
$toggleCode = @'
document.addEventListener('click', (event) => {
    const toggle = event.target.closest('.telebirr-secret-toggle');
    if (!toggle) return;

    const field = document.getElementById(toggle.dataset.toggleTarget);
    if (!field) return;

    const showing = toggle.getAttribute('aria-pressed') === 'true';
    const nextShowing = !showing;

    if (field.id === 'telebirrPrivateKey') {
        field.classList.toggle('telebirr-secret-masked', !nextShowing);
    } else {
        field.type = nextShowing ? 'text' : 'password';
    }

    toggle.textContent = nextShowing ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(nextShowing));
});

'@
$admin = Replace-Once $admin @'
async function saveTelebirrSettings(event) {
'@ ($toggleCode + @'
async function saveTelebirrSettings(event) {
'@) 'Credential visibility controls'

$css += @'

/* Telebirr credentials: masked by default with explicit Show/Hide controls. */
.telebirr-secret-control {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
}
.telebirr-secret-control input,
.telebirr-secret-control textarea {
    flex: 1 1 auto;
    min-width: 0;
}
.telebirr-secret-toggle {
    flex: 0 0 auto;
    min-height: 38px;
    padding: 8px 12px;
    border: 1px solid #c8b8a8;
    border-radius: 8px;
    background: #fff;
    color: #5b3924;
    cursor: pointer;
    font-weight: 600;
}
.telebirr-private-key-control textarea.telebirr-secret-masked {
    -webkit-text-security: disc;
}
.telebirr-secret-toggle:focus-visible {
    outline: 3px solid rgba(169, 99, 39, .3);
    outline-offset: 2px;
}
'@

# Final checks happen before writing files.
if ($server -notmatch 'function decryptTelebirrSecret') {
    throw 'Missing decryption helper. No files written.'
}
if ($server -notmatch 'environment = \$8') {
    throw 'Branch SQL check failed. No files written.'
}
if ($admin -notmatch 'Branch details load failed') {
    throw 'Branch loader check failed. No files written.'
}
if ($html -notmatch 'data-toggle-target="telebirrPrivateKey"') {
    throw 'Private key toggle check failed. No files written.'
}

# Create timestamped backups, then write only the four intended files.
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($file in @($serverPath, $adminPath, $htmlPath, $cssPath)) {
    Copy-Item $file "$file.backup-branch-settings-$stamp"
}

Set-Content $serverPath -Value $server -Encoding utf8
Set-Content $adminPath -Value $admin -Encoding utf8
Set-Content $htmlPath -Value $html -Encoding utf8
Set-Content $cssPath -Value $css -Encoding utf8

node --check .\server.js
if ($LASTEXITCODE -ne 0) { throw 'server.js syntax check failed.' }

node --check .\scripts\admin.js
if ($LASTEXITCODE -ne 0) { throw 'scripts/admin.js syntax check failed.' }

Write-Host 'Patch applied. JavaScript syntax checks passed. No commit or push performed.'
