
function getCompanyLoadingImage() {
    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="180"
            height="180"
            viewBox="0 0 180 180"
        >
            <rect width="180" height="180" rx="24" fill="#f5efe6"/>
            <circle
                cx="90"
                cy="72"
                r="25"
                fill="none"
                stroke="#9a6b3f"
                stroke-width="6"
                stroke-linecap="round"
                stroke-dasharray="90 70"
            >
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 90 72"
                    to="360 90 72"
                    dur="1s"
                    repeatCount="indefinite"
                />
            </circle>
            <text
                x="90"
                y="125"
                text-anchor="middle"
                font-family="Arial, sans-serif"
                font-size="15"
                font-weight="700"
                fill="#6b4a2f"
            >Loading...</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

let companyDefaultImage = getCompanyLoadingImage();

async function loadCompanySettings() {
    const loadingTitle =
        document.getElementById('companyProfileLoadingTitle');
    const loadingMessage =
        document.getElementById('companyProfileLoadingMessage');
    const retryButton =
        document.getElementById('companyProfileRetry');

    document.body.classList.add('company-profile-loading');
    document.body.classList.remove('company-profile-error');
    loadingTitle.textContent = 'Loading company profile...';
    loadingMessage.textContent = '';
    retryButton.hidden = true;

    document.querySelectorAll(
        '[data-company-logo]'
    ).forEach(element => {
        element.src = companyDefaultImage;
    });

    try {

        const response =
            await fetch(
                '/api/company-settings'
            );

        const data =
            await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(
                data?.message ||
                `Company profile request failed (HTTP ${response.status}).`
            );
        }

        const settings = data.settings;

        if (
            !settings ||
            typeof settings !== 'object' ||
            Array.isArray(settings) ||
            typeof settings.companyName !== 'string' ||
            !settings.companyName.trim()
        ) {
            throw new Error(
                'Company profile settings are missing or have no company name.'
            );
        }

        companyDefaultImage =
            settings.defaultImage || getCompanyLoadingImage();

        const companyName =
            settings.companyName || '';
        document.title = companyName
            ? `${companyName} - Company Profile`
            : 'Company Profile';

        const slogan =
            settings.slogan || '';

        const phoneNumbers =
            Array.isArray(settings.phoneNumbers) ? settings.phoneNumbers : (settings.phone ? [settings.phone] : []);

        const email =
            settings.email || '';

    

        const companyLogo =
            settings.logo || companyDefaultImage;

        document.querySelectorAll(
            '[data-company-logo]'
        ).forEach(element => {
            element.src = companyLogo;
        });

        document.querySelectorAll(
            '[data-company-name]'
        ).forEach(element => {
            element.textContent = companyName;
        });

        document.querySelectorAll(
            '[data-company-footer-name]'
        ).forEach(element => {
            element.textContent = companyName;
        });

        document.querySelectorAll(
            '[data-company-slogan]'
        ).forEach(element => {
            element.textContent = slogan;
        });

        
        const about =
            settings.about || '';

        document.querySelectorAll(
            '[data-company-about]'
        ).forEach(element => {
            element.textContent = about;
        });
const phoneList = document.querySelector('[data-company-phone-list]');

        if (phoneList) {
            phoneList.innerHTML = '';

            phoneNumbers.forEach(phoneNumber => {
                const link = document.createElement('a');
                link.href = 'tel:' + phoneNumber;

                const strong = document.createElement('strong');
                strong.textContent = phoneNumber;

                link.appendChild(strong);
                phoneList.appendChild(link);
            });
        }

        document.querySelectorAll(
            '[data-company-email]'
        ).forEach(element => {
            element.textContent = email;
        });

        document.querySelectorAll(
            '[data-company-email-link]'
        ).forEach(element => {
            element.href = `mailto:${email}`;
        });

        const addresses =
    Array.isArray(settings.addresses)
        ? settings.addresses
        : [];

const locationContainer =
    document.querySelector('[data-company-location-list]');

if (locationContainer) {

    locationContainer.innerHTML = '';

    addresses.forEach(location => {

        const name =
            String(location.name || '').trim();

        const url =
            String(location.url || '').trim();

        if (!name) {
            return;
        }
const item =
            document.createElement('div');

        item.style.cssText =
            'display:flex;flex-direction:column;gap:2px;';

        const strong =
            document.createElement('strong');

        strong.textContent = name;

        if (url) {
            const link =
                document.createElement('a');

            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            link.appendChild(strong);
            item.appendChild(link);
        } else {
            item.appendChild(strong);
        }

        locationContainer.appendChild(item);
    });
}

        const companyContent =
            Array.isArray(settings.companyContent)
                ? settings.companyContent
                : [];

        renderCompanyContent(companyContent);

        document.body.classList.remove(
            'company-profile-loading',
            'company-profile-error'
        );

    } catch (error) {

        console.error(
            '[company-settings] Error:',
            error
        );

        loadingTitle.textContent = 'Company profile unavailable';
        loadingMessage.textContent =
            error?.message ||
            'The company profile could not be loaded.';
        document.title = 'Company profile unavailable';
        retryButton.hidden = false;
        document.body.classList.remove('company-profile-loading');
        document.body.classList.add('company-profile-error');

    }
}


document.addEventListener(
    'DOMContentLoaded',
    loadCompanySettings
);

document.getElementById('companyProfileRetry')
    .addEventListener('click', loadCompanySettings);


function renderCompanyContent(companyContent) {

    const container =
        document.querySelector(
            '[data-company-content-list]'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(companyContent)) {
        return;
    }

    companyContent.forEach(item => {

        const topic =
            String(item.topic || '').trim();

        const subTopic =
            String(item.subTopic || '').trim();

        const image =
            String(item.image || '').trim();

        const description =
            String(item.description || '').trim();

        if (!topic && !subTopic && !image && !description) {
            return;
        }

        const contentItem =
            document.createElement('article');

        contentItem.className =
            'company-content-item';

        if (image && !topic && !subTopic && !description) {
            contentItem.classList.add(
                'company-content-image-only'
            );
        }

        const topicImageOnly =
            topic &&
            image &&
            !subTopic &&
            !description;

        if (topicImageOnly) {

            const topicImageWrapper =
                document.createElement('div');

            topicImageWrapper.className =
                'company-content-topic-image';

            const topicElement =
                document.createElement('h2');

            topicElement.textContent = topic;

            topicImageWrapper.appendChild(
                topicElement
            );

            const imageElement =
                document.createElement('img');

            imageElement.src = image;

            imageElement.alt =
                topic || 'Company content';

            topicImageWrapper.appendChild(
                imageElement
            );

            contentItem.appendChild(
                topicImageWrapper
            );

        } else {

            if (topic) {

                const topicElement =
                    document.createElement('h2');

                topicElement.textContent = topic;

                contentItem.appendChild(
                    topicElement
                );
            }

            if (image) {

                const imageElement =
                    document.createElement('img');

                imageElement.src = image;

                imageElement.alt =
                    topic || subTopic || 'Company content';

                contentItem.appendChild(
                    imageElement
                );
            }
        }

        const imageSubtopicOnly =
            image &&
            subTopic &&
            !topic &&
            !description;

        if (imageSubtopicOnly) {

            const imageSubtopicWrapper =
                document.createElement('div');

            imageSubtopicWrapper.className =
                'company-content-image-subtopic';

            const imageElement =
                contentItem.querySelector('img');

            if (imageElement) {
                contentItem.removeChild(imageElement);

                imageSubtopicWrapper.appendChild(
                    imageElement
                );
            }

            const subTopicElement =
                document.createElement('h3');

            subTopicElement.textContent =
                subTopic;

            imageSubtopicWrapper.appendChild(
                subTopicElement
            );

            contentItem.appendChild(
                imageSubtopicWrapper
            );

        } else {

        const textContent =
            document.createElement('div');

        textContent.className =
            'company-content-text';

        if (subTopic) {

            const subTopicElement =
                document.createElement('h3');

            subTopicElement.textContent = subTopic;

            textContent.appendChild(
                subTopicElement
            );
        }

        if (description) {

            const descriptionElement =
                document.createElement('p');

            const urlPattern =
                /(https?:\/\/[^\s]+)/g;

            let lastIndex = 0;
            let match;

            while ((match = urlPattern.exec(description)) !== null) {

                descriptionElement.appendChild(
                    document.createTextNode(
                        description.slice(
                            lastIndex,
                            match.index
                        )
                    )
                );

                const link =
                    document.createElement('a');

                link.href = match[0];
                link.textContent = match[0];
                link.target = '_blank';
                link.rel = 'noopener noreferrer';

                descriptionElement.appendChild(link);

                lastIndex =
                    match.index + match[0].length;
            }

            descriptionElement.appendChild(
                document.createTextNode(
                    description.slice(lastIndex)
                )
            );

            textContent.appendChild(
                descriptionElement
            );
        }

        if (subTopic || description) {

            contentItem.appendChild(
                textContent
            );
        }

        }

        container.appendChild(
            contentItem
        );
    });
}

async function loadRestaurantSlides() {

    const slider =
        document.getElementById(
            'companyHeroSlider'
        );

    if (!slider) {
        return;
    }

    try {

        const response =
            await fetch(
                '/api/company-restaurants'
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (!data.ok) {
            return;
        }

        const restaurants =
            Array.isArray(data.restaurants)
                ? data.restaurants
                : [];

        const activeRestaurants =
            restaurants.filter(
                restaurant =>
                    restaurant.status === 'active'
            );

        const restaurantCount =
            document.getElementById(
                'activeRestaurantCount'
            );

        if (restaurantCount) {
            restaurantCount.textContent =
                activeRestaurants.length.toLocaleString();
        }

        slider.innerHTML = '';

        activeRestaurants.forEach(
            (restaurant, index) => {

                const slide =
                    document.createElement('div');

                slide.className =
                    index === 0
                        ? 'slide active'
                        : 'slide';


                const image =
                    document.createElement('img');

                image.src =
                    companyDefaultImage;

                image.alt =
                    restaurant.name || 'Restaurant';


                fetch(
                    `/api/menu/${encodeURIComponent(
                        restaurant.slug
                    )}/logo`
                )
                    .then(response => {

                        if (!response.ok) {
                            throw new Error(
                                'Restaurant logo not found.'
                            );
                        }

                        return response.text();

                    })
                    .then(logo => {

                        if (logo) {
                            image.src = logo;
                        }

                    })
                    .catch(() => {

                        image.src =
                            companyDefaultImage;

                    });


                const content =
                    document.createElement('div');

                content.className =
                    'slide-content';


                const title =
                    document.createElement('h1');

                title.textContent =
                    restaurant.name || '';


                const button =
                    document.createElement('button');

                button.type = 'button';

                button.textContent =
                    'View Menu \u2192';

                button.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `/${encodeURIComponent(
                                restaurant.slug
                            )}`;

                    }
                );


                content.appendChild(title);

                content.appendChild(button);

                slide.appendChild(image);

                slide.appendChild(content);

                slider.appendChild(slide);

            }
        );

        startRestaurantSlideshow();

    } catch (error) {

        console.error(
            '[restaurant-slides] Error:',
            error
        );

    }
}

async function loadClientDirectory() {
    const container =
        document.getElementById('clientDirectoryGrid');

    const directory =
        document.getElementById('ourClients');

    if (!container || !directory) {
        return;
    }

    if (directory.dataset.loaded === 'true') {
        return;
    }

    try {
        const response = await fetch(
            '/api/company-client-directory'
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(
                data.message || 'Unable to load the client directory.'
            );
        }

        const restaurants =
            Array.isArray(data.restaurants)
                ? data.restaurants
                : [];

        directory.dataset.loaded = 'true';
        container.replaceChildren();

        const searchInput =
            document.getElementById('clientDirectorySearch');
        const resultCount =
            document.getElementById('clientDirectoryCount');

        if (!restaurants.length) {
            const emptyState = document.createElement('p');
            emptyState.className = 'client-directory-status';
            emptyState.textContent =
                'No active cafes or restaurants are listed yet.';
            container.appendChild(emptyState);
            if (resultCount) {
                resultCount.textContent = 'No clients to show';
            }
            return;
        }

        const cards = [];

        restaurants.forEach(restaurant => {
            const card = document.createElement('article');
            card.className = 'client-directory-card';

            const heading = document.createElement('div');
            heading.className = 'client-directory-card-heading';

            const logo = document.createElement('img');
            logo.className = 'client-directory-logo';
            logo.src = companyDefaultImage;
            logo.alt = '';
            logo.loading = 'lazy';

            fetch(
                `/api/menu/${encodeURIComponent(restaurant.slug)}/logo`
            )
                .then(logoResponse => {
                    if (!logoResponse.ok) {
                        throw new Error('Restaurant logo not found.');
                    }

                    return logoResponse.text();
                })
                .then(logoData => {
                    if (logoData) {
                        logo.src = logoData;
                    }
                })
                .catch(error => {
                    console.warn(
                        `[company:client-directory] Logo unavailable for ${restaurant.slug}:`,
                        error
                    );
                });

            const name = document.createElement('h3');
            name.textContent = restaurant.name || 'cafe or restaurant';

            heading.append(logo, name);
            card.appendChild(heading);

            const contactList = document.createElement('div');
            contactList.className = 'client-directory-details';

            const phoneNumbers = Array.isArray(restaurant.phone_numbers)
                ? restaurant.phone_numbers.filter(
                    phone => typeof phone === 'string' && phone.trim()
                )
                : [];

            const phoneRow = document.createElement('div');
            phoneRow.className = 'client-directory-detail';
            const phoneLabel = document.createElement('strong');
            phoneLabel.textContent = 'Mobile';
            const phoneContent = document.createElement('div');

            if (phoneNumbers.length) {
                phoneNumbers.forEach(phone => {
                    const phoneLink = document.createElement('a');
                    phoneLink.href = `tel:${phone.trim()}`;
                    phoneLink.textContent = phone.trim();
                    phoneContent.appendChild(phoneLink);
                });
            } else {
                phoneContent.textContent = 'Not provided';
            }

            phoneRow.append(phoneLabel, phoneContent);
            contactList.appendChild(phoneRow);

            const addresses = Array.isArray(restaurant.addresses)
                ? restaurant.addresses.filter(
                    address =>
                        address &&
                        typeof address === 'object' &&
                        typeof address.name === 'string' &&
                        address.name.trim()
                )
                : [];

            const addressRow = document.createElement('div');
            addressRow.className = 'client-directory-detail';
            const addressLabel = document.createElement('strong');
            addressLabel.textContent = 'Address';
            const addressContent = document.createElement('div');

            if (addresses.length) {
                addresses.forEach(address => {
                    const url = String(address.url || '').trim();
                    let safeUrl = '';

                    if (url) {
                        try {
                            const parsedUrl = new URL(url, window.location.origin);
                            if (
                                parsedUrl.protocol === 'https:' ||
                                parsedUrl.protocol === 'http:'
                            ) {
                                safeUrl = parsedUrl.href;
                            }
                        } catch (error) {
                            console.warn(
                                '[company:client-directory] Ignoring invalid address link:',
                                error
                            );
                        }
                    }

                    const location = safeUrl
                        ? document.createElement('a')
                        : document.createElement('span');

                    if (safeUrl) {
                        location.href = safeUrl;
                        location.target = '_blank';
                        location.rel = 'noopener noreferrer';
                    }

                    location.textContent = address.name.trim();
                    addressContent.appendChild(location);
                });
            } else {
                addressContent.textContent = 'Not provided';
            }

            addressRow.append(addressLabel, addressContent);
            contactList.appendChild(addressRow);
            card.appendChild(contactList);

            const cardFooter =
                document.createElement('div');
            cardFooter.className =
                'client-directory-card-footer';

            const viewMenu =
                document.createElement('a');
            viewMenu.className =
                'client-directory-menu-button';
            viewMenu.href =
                `/${encodeURIComponent(restaurant.slug)}`;
            viewMenu.textContent =
                'View Menu \u2192';

            cardFooter.appendChild(viewMenu);
            card.appendChild(cardFooter);
            card.dataset.searchText = [
                restaurant.name || '',
                ...phoneNumbers,
                ...addresses.map(address => address.name)
            ].join(' ').toLocaleLowerCase();

            container.appendChild(card);
            cards.push(card);
        });

        const searchPrompt =
            document.createElement('p');
        searchPrompt.className =
            'client-directory-status';
        searchPrompt.textContent =
            'Search by cafe name, mobile number, or address to see matching clients.';
        container.appendChild(searchPrompt);

        const noResults =
            document.createElement('p');
        noResults.className =
            'client-directory-status';
        noResults.textContent =
            'No cafes or restaurants match your search.';
        noResults.hidden = true;
        container.appendChild(noResults);

        const updateResults = () => {
            const query =
                String(searchInput?.value || '')
                    .trim()
                    .toLocaleLowerCase();

            let visibleCount = 0;

            cards.forEach(card => {
                const matches = card.dataset.searchText.includes(query);
                card.hidden = !query || !matches;
                if (matches) {
                    visibleCount += 1;
                }
            });

            searchPrompt.hidden = Boolean(query);
            noResults.hidden = !query || visibleCount > 0;

            if (resultCount) {
                resultCount.textContent = query
                    ? `Showing ${visibleCount} of ${cards.length} clients`
                    : 'Search to see clients';
            }
        };

        searchInput?.addEventListener('input', updateResults);
        updateResults();
    } catch (error) {
        console.error(
            '[company:client-directory] Error:',
            error
        );
        container.textContent =
            'Unable to load cafes and restaurants right now.';
    }
}


function startRestaurantSlideshow() {

    const slider =
        document.getElementById(
            'companyHeroSlider'
        );

    const slides =
        slider.querySelectorAll(
            '.slide'
        );

    if (slides.length <= 1) {
        return;
    }

    let currentSlide = 0;

    const showSlide = (index) => {

        slides[currentSlide]
            .classList
            .remove('active');

        currentSlide = index;

        if (currentSlide < 0) {
            currentSlide = slides.length - 1;
        }

        if (currentSlide >= slides.length) {
            currentSlide = 0;
        }

        slides[currentSlide]
            .classList
            .add('active');
    };

    const controls =
        document.createElement('div');

    controls.className =
        'slider-controls';

    const previousButton =
        document.createElement('button');

    previousButton.type =
        'button';

    previousButton.className =
        'slider-prev';

    previousButton.textContent =
        '‹';

    previousButton.setAttribute(
        'aria-label',
        'Previous slide'
    );

    const nextButton =
        document.createElement('button');

    nextButton.type =
        'button';

    nextButton.className =
        'slider-next';

    nextButton.textContent =
        '›';

    nextButton.setAttribute(
        'aria-label',
        'Next slide'
    );

    previousButton.addEventListener(
        'click',
        () => {
            showSlide(
                currentSlide - 1
            );
        }
    );

    nextButton.addEventListener(
        'click',
        () => {
            showSlide(
                currentSlide + 1
            );
        }
    );

    controls.appendChild(
        previousButton
    );

    controls.appendChild(
        nextButton
    );

    slider.appendChild(
        controls
    );

    setInterval(() => {

        showSlide(
            currentSlide + 1
        );

    }, 5000);
}


function initializeHeaderMenu() {
    const toggle =
        document.getElementById('headerMenuToggle');

    const header =
        document.querySelector('.main-header');

    if (!toggle || !header) {
        return;
    }

    const closeMenu = () => {
        header.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation menu');

        const panel = document.getElementById('headerMenu');

        if (panel) {
            panel.hidden = true;
        }
    };

    toggle.addEventListener('click', () => {
        const isOpen =
            header.classList.toggle('menu-open');

        const panel = document.getElementById('headerMenu');

        if (panel) {
            panel.hidden = !isOpen;
        }

        toggle.setAttribute(
            'aria-expanded',
            String(isOpen)
        );
        toggle.setAttribute(
            'aria-label',
            isOpen ? 'Close navigation menu' : 'Open navigation menu'
        );
    });

    document.querySelectorAll(
        'a[href="#ourClients"]'
    ).forEach(link => {
        link.addEventListener('click', async event => {
            event.preventDefault();
            closeMenu();

            const directory =
                document.getElementById('ourClients');

            if (!directory) {
                return;
            }

            directory.hidden = false;
            await loadClientDirectory();
            directory.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            const searchInput =
                document.getElementById('clientDirectorySearch');

            requestAnimationFrame(() => {
                searchInput?.focus({
                    preventScroll: true
                });
            });
        });
    });

    document.querySelectorAll(
        '.header-menu-panel a:not([href="#ourClients"])'
    ).forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', event => {
        if (!header.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeMenu();
            toggle.focus();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadRestaurantSlides();
    initializeHeaderMenu();
});
