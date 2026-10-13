'use strict';

let menuExpirationRecords = [];
const shownMenuExpirationWarnings = new Set();
let menuExpirationCheckTimer = null;

function getMenuExpirationDaysRemaining(expirationDate) {
    if (!expirationDate) {
        return null;
    }

    const dateText = String(expirationDate).slice(0, 10);
    const parts = dateText.split('-').map(Number);

    if (parts.length !== 3 || parts.some(part => !Number.isInteger(part))) {
        return null;
    }

    const expirationUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    const todayUtc = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
    );

    return Math.ceil((expirationUtc - todayUtc) / 86400000);
}


function formatMenuExpirationDate(expirationDate) {
    if (!expirationDate) {
        return '';
    }

    const dateText = String(expirationDate).slice(0, 10);
    const parts = dateText.split('-').map(Number);

    if (parts.length !== 3 || parts.some(part => !Number.isInteger(part))) {
        return dateText;
    }

    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
        .toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });
}


function setMenuExpirationWarnings(restaurants) {
    menuExpirationRecords = Array.isArray(restaurants)
        ? restaurants.filter(restaurant => restaurant?.menu_expires_at || restaurant?.menuExpirationDate)
        : [];

    renderMenuExpirationCountdown();
    checkMenuExpirationWarnings();

    if (!menuExpirationCheckTimer) {
        menuExpirationCheckTimer = window.setInterval(
            checkMenuExpirationWarnings,
            60000
        );
    }
}


function renderMenuExpirationCountdown() {
    const banner = document.getElementById('menuExpirationCountdown');

    if (banner) {
        const restaurant = menuExpirationRecords[0];
        const expirationDate =
            restaurant?.menu_expires_at ??
            restaurant?.menuExpirationDate;

        if (!restaurant || !expirationDate) {
            banner.hidden = true;
            banner.replaceChildren();
        } else {
            const daysRemaining = getMenuExpirationDaysRemaining(expirationDate);
            const name =
                restaurant.name ??
                restaurant.restaurantName ??
                'Restaurant';
            const slug =
                restaurant.slug ??
                restaurant.restaurantSlug ??
                '';

            banner.hidden = false;
            banner.classList.toggle('is-expired', daysRemaining <= 0);
            banner.classList.toggle(
                'is-urgent',
                daysRemaining > 0 && daysRemaining <= 15
            );
            banner.textContent = '';

            const title = document.createElement('strong');
            title.textContent = daysRemaining <= 0
                ? 'Menu access expired'
                : `Menu expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;

            const details = document.createElement('span');
            details.textContent =
                `${name}${slug ? ` · ${slug}` : ''} · ${formatMenuExpirationDate(expirationDate)}`;

            banner.append(title, details);
        }
    }

    document
        .querySelectorAll('[data-menu-expiration-id]')
        .forEach(button => {
            const expirationDate = button.dataset.expirationDate;

            if (!expirationDate) {
                button.textContent = 'Set Expiration';
                return;
            }

            const daysRemaining =
                getMenuExpirationDaysRemaining(expirationDate);

            button.textContent =
                daysRemaining === null
                    ? 'Menu Expiration'
                    : daysRemaining <= 0
                        ? 'Menu Expired'
                        : `Expires in ${daysRemaining}d`;
        });
}


function checkMenuExpirationWarnings() {
    const dueWarnings = [];

    menuExpirationRecords.forEach(restaurant => {
        const expirationDate =
            restaurant.menu_expires_at ??
            restaurant.menuExpirationDate;
        const daysRemaining =
            getMenuExpirationDaysRemaining(expirationDate);

        if (
            daysRemaining === null ||
            daysRemaining > 15
        ) {
            return;
        }

        const slug =
            restaurant.slug ??
            restaurant.restaurantSlug ??
            '';
        const warningStage =
            daysRemaining <= 0
                ? 'expired'
                : daysRemaining === 1
                    ? 'urgent'
                    : daysRemaining === 10
                        ? 'second'
                        : daysRemaining > 10
                            ? 'first'
                            : `daily-${daysRemaining}`;
        const warningKey =
            `${slug}:${String(expirationDate).slice(0, 10)}:${warningStage}`;

        if (!shownMenuExpirationWarnings.has(warningKey)) {
            shownMenuExpirationWarnings.add(warningKey);
            dueWarnings.push({
                ...restaurant,
                expirationDate,
                daysRemaining
            });
        }
    });

    if (dueWarnings.length) {
        showMenuExpirationWarningPopup(dueWarnings);
    }
}


function showMenuExpirationWarningPopup(restaurants) {
    const existing = document.getElementById('menuExpirationWarningOverlay');
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'menuExpirationWarningOverlay';
    overlay.className = 'menu-expiration-overlay';
    overlay.setAttribute('role', 'presentation');

    const dialog = document.createElement('section');
    dialog.className = 'menu-expiration-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'menuExpirationWarningTitle');

    const header = document.createElement('div');
    header.className = 'menu-expiration-dialog-header';

    const headingGroup = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'menu-expiration-eyebrow';
    eyebrow.textContent = 'Restaurant menu access';

    const heading = document.createElement('h2');
    heading.id = 'menuExpirationWarningTitle';
    heading.textContent = 'Menu expiration warning';
    headingGroup.append(eyebrow, heading);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'menu-expiration-close';
    close.setAttribute('aria-label', 'Close expiration warning');
    close.textContent = '×';
    close.addEventListener('click', () => overlay.remove());
    header.append(headingGroup, close);

    const body = document.createElement('div');
    body.className = 'menu-expiration-warning-list';

    restaurants.forEach(restaurant => {
        const card = document.createElement('article');
        const expired = restaurant.daysRemaining <= 0;
        const urgent = !expired && restaurant.daysRemaining <= 1;
        card.className = `menu-expiration-warning-card${expired ? ' is-expired' : ''}${urgent ? ' is-urgent' : ''}`;

        const days = document.createElement('strong');
        days.className = 'menu-expiration-days';
        days.textContent = expired
            ? 'Expired · 0 days remaining'
            : `${restaurant.daysRemaining} day${restaurant.daysRemaining === 1 ? '' : 's'} remaining`;

        const explanation = document.createElement('p');
        explanation.className = 'menu-expiration-explanation';
        explanation.textContent = expired
            ? 'Customer menu access has expired and is disabled.'
            : restaurant.daysRemaining > 10
                ? 'First warning: menu access is approaching its expiration date.'
                : restaurant.daysRemaining === 10
                    ? 'Second warning: menu access is approaching its expiration date.'
                    : restaurant.daysRemaining === 1
                        ? 'Urgent warning: menu access expires in one day.'
                        : 'Menu access is approaching its expiration date.';

        const details = document.createElement('dl');
        details.className = 'menu-expiration-details';

        [
            ['Restaurant', restaurant.name ?? restaurant.restaurantName ?? 'Restaurant'],
            ['Slug', restaurant.slug ?? restaurant.restaurantSlug ?? ''],
            ['Expiration', formatMenuExpirationDate(restaurant.expirationDate)]
        ].forEach(([label, value]) => {
            const row = document.createElement('div');
            const term = document.createElement('dt');
            const description = document.createElement('dd');
            term.textContent = label;
            description.textContent = value;
            row.append(term, description);
            details.appendChild(row);
        });

        card.append(days, explanation, details);
        body.appendChild(card);
    });

    const footer = document.createElement('div');
    footer.className = 'menu-expiration-dialog-footer';
    const acknowledge = document.createElement('button');
    acknowledge.type = 'button';
    acknowledge.className = 'menu-expiration-acknowledge';
    acknowledge.textContent = 'Understood';
    acknowledge.addEventListener('click', () => overlay.remove());
    footer.appendChild(acknowledge);

    dialog.append(header, body, footer);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });
    document.body.appendChild(overlay);
    acknowledge.focus();
}
