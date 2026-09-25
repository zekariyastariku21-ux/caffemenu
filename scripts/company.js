
async function loadCompanySettings() {

    try {

        const response =
            await fetch(
                '/api/company-settings'
            );

        const data =
            await response.json();

        if (!response.ok || !data.ok) {
            return;
        }

        const settings =
            data.settings || {};

        const companyName =
            settings.companyName || '';

        const slogan =
            settings.slogan || '';

        const phoneNumbers =
            Array.isArray(settings.phoneNumbers) ? settings.phoneNumbers : (settings.phone ? [settings.phone] : []);

        const email =
            settings.email || '';

    

        const companyLogo =
            settings.logo || 'image/z logo.jpeg';

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
            '[data-company-slogan]'
        ).forEach(element => {
            element.textContent = slogan;
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

        if (!name || !url) {
            return;
        }

        const item =
            document.createElement('div');

        item.style.cssText =
            'display:flex;flex-direction:column;gap:2px;';

        const link =
            document.createElement('a');

        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const strong =
            document.createElement('strong');

        strong.textContent = name;

        link.appendChild(strong);
        item.appendChild(link);

        locationContainer.appendChild(item);
    });
}

    } catch (error) {

        console.error(
            '[company-settings] Error:',
            error
        );

    }
}


document.addEventListener(
    'DOMContentLoaded',
    loadCompanySettings
);


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
                    'image/z logo.jpeg';

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
                            'image/z logo.jpeg';

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
                    'View Menu';

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


function startRestaurantSlideshow() {

    const slides =
        document.querySelectorAll(
            '#companyHeroSlider .slide'
        );

    if (slides.length <= 1) {
        return;
    }

    let currentSlide = 0;

    setInterval(() => {

        slides[currentSlide]
            .classList
            .remove('active');

        currentSlide++;

        if (currentSlide >= slides.length) {
            currentSlide = 0;
        }

        slides[currentSlide]
            .classList
            .add('active');

    }, 5000);
}


document.addEventListener(
    'DOMContentLoaded',
    loadRestaurantSlides
);

