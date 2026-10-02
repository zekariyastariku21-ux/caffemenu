
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
            settings.logo || 'image/z-menu.jpg';

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
                    'image/z-menu.jpg';

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
                            'image/z-menu.jpg';

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


document.addEventListener(
    'DOMContentLoaded',
    loadRestaurantSlides
);

