
        // Данные загружаются из catalog-data.js
        
        
    
        
        // Глобальные переменные
        let currentPage = 1;
        const gamesPerPage = 100;
        let filteredGames = [];
        let sortByNovelty = false;
        let showFavoritesOnly = false;
        let currentGameIndex = -1;
        
        // Работа с избранным (localStorage)
        function getFavorites() {
            const favs = localStorage.getItem('ps_favorites');
            return favs ? JSON.parse(favs) : [];
        }
        
        function saveFavorites(favorites) {
            localStorage.setItem('ps_favorites', JSON.stringify(favorites));
        }
        
        function isFavorite(gameTitle) {
            const favorites = getFavorites();
            return favorites.includes(gameTitle);
        }
        
        function toggleFavorite() {
            if (currentGameIndex === -1) return;
            
            const game = filteredGames[currentGameIndex];
            const favorites = getFavorites();
            const index = favorites.indexOf(game.title);
            
            if (index > -1) {
                favorites.splice(index, 1);
                document.getElementById('modalFavoriteBtn').classList.remove('active');
                document.querySelector('#modalFavoriteBtn .heart').textContent = '♡';
            } else {
                favorites.push(game.title);
                document.getElementById('modalFavoriteBtn').classList.add('active');
                document.querySelector('#modalFavoriteBtn .heart').textContent = '♥';
            }
            
            saveFavorites(favorites);
            
            // Если показываем только избранное, обновляем список
            if (showFavoritesOnly) {
                applyFilters();
            }
        }
        
        // Добавление/удаление из избранного с карточки
        function toggleCardFavorite(gameTitle, button) {
            const favorites = getFavorites();
            const index = favorites.indexOf(gameTitle);
            
            if (index > -1) {
                favorites.splice(index, 1);
                button.classList.remove('active');
            } else {
                favorites.push(gameTitle);
                button.classList.add('active');
            }
            
            saveFavorites(favorites);
            
            // Если показываем только избранное, обновляем список
            if (showFavoritesOnly) {
                applyFilters();
            }
        }
        
        // Увеличение изображения
        function enlargeImage(src) {
            document.getElementById('enlargedImage').src = src;
            document.getElementById('imageModal').style.display = 'block';
        }
        
        // Транслитерация для поиска (stray = ыекфн)
        function transliterate(text) {
            const ruToEn = {
                'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p',
                'х':'[','ъ':']','ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k',
                'д':'l','ж':';','э':"'",'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n',
                'ь':'b','б':',','ю':'.'
            };
            const enToRu = Object.fromEntries(Object.entries(ruToEn).map(([k, v]) => [v, k]));
            
            let result = text.toLowerCase();
            // Конвертируем в обе стороны
            let variants = [result];
            
            // Русский -> Английский
            variants.push(result.split('').map(c => ruToEn[c] || c).join(''));
            // Английский -> Русский
            variants.push(result.split('').map(c => enToRu[c] || c).join(''));
            
            return variants;
        }
        
        // Улучшенный поиск с транслитерацией
        function smartSearch(gameTitle, searchQuery) {
            if (!searchQuery) return true;
            
            const titleLower = gameTitle.toLowerCase();
            const queryLower = searchQuery.toLowerCase();
            
            // Прямое совпадение
            if (titleLower.includes(queryLower)) return true;
            
            // Поиск с транслитерацией
            const queryVariants = transliterate(queryLower);
            return queryVariants.some(variant => titleLower.includes(variant));
        }
        
        // Замена "nan" на "неизвестно"
        function replaceNaN(text) {
            if (!text || text === 'nan' || text === 'NaN' || text === 'null') {
                return 'неизвестно';
            }
            return String(text).replace(/nan/gi, 'неизвестно').replace(/NaN/g, 'неизвестно');
        }
        
        // Функция для создания звезд рейтинга
        function createStars(rating) {
            // Не показываем рейтинг если он больше 5 или равен 0
            if (rating > 5 || rating === 0) {
                return '';
            }
            
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
            
            let html = '';
            for (let i = 0; i < fullStars; i++) {
                html += '<span class="star">★</span>';
            }
            if (hasHalfStar) {
                html += '<span class="star half">★</span>';
            }
            for (let i = 0; i < emptyStars; i++) {
                html += '<span class="star empty">★</span>';
            }
            html += `<span class="rating-number">(${rating.toFixed(1)})</span>`;
            return html;
        }
        
        // Функция для расчета обратного отсчета
        function calculateCountdown(endDate) {
            if (!endDate) return '';
            
            try {
                const parts = endDate.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
                if (!parts) return '';
                
                const targetDate = new Date(parts[3], parts[2] - 1, parts[1], parts[4], parts[5]);
                targetDate.setHours(targetDate.getHours() - 3); // GMT+3 adjustment
                
                const now = new Date();
                const diff = targetDate - now;
                
                if (diff <= 0) return 'Скидка закончилась';
                
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                return `${days}д ${hours}ч ${minutes}м ${seconds}с`;
            } catch (e) {
                return '';
            }
        }
        
        // Функция для парсинга даты выхода
        function parseReleaseDate(dateStr) {
            if (!dateStr) return new Date(0);
            const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
                return new Date(match[3], match[2] - 1, match[1]);
            }
            return new Date(0);
        }
        
        // Отображение игр
        function displayGames() {
            const grid = document.getElementById('gamesGrid');
            const startIdx = (currentPage - 1) * gamesPerPage;
            const endIdx = startIdx + gamesPerPage;
            const pagGames = filteredGames.slice(startIdx, endIdx);
            
            grid.innerHTML = pagGames.map((game, idx) => {
                const hasDiscount = game.discount_price_rub && game.discount_price_rub !== 'nan' && game.discount_price_rub !== game.price_rub;
                const price = hasDiscount ? game.discount_price_rub : game.price_rub;
                
                // Проверка на валидность цены
                let displayPrice = 'Цена не указана';
                if (price === 'Free' || price === 'free') {
                    displayPrice = 'Бесплатно';
                } else if (price && price !== 'nan' && price !== 'NaN' && price !== '') {
                    const priceNum = parseFloat(price);
                    if (!isNaN(priceNum) && priceNum > 0) {
                        displayPrice = `${Math.round(priceNum)} ₽`;
                    }
                }
                
                // Очистка процента скидки от лишних символов
                const cleanDiscount = game.discount_percent ? game.discount_percent.replace(/-/g, '').replace(/%/g, '').trim() : '';
                
                return `
                    <div class="game-card" onclick="showModal(${startIdx + idx})">
                        ${hasDiscount && cleanDiscount ? 
                            `<div class="discount-ribbon">Скидка ${cleanDiscount}%</div>` : ''}
                        <div style="position: relative;">
                            <img class="game-image" src="${game.image}" alt="${game.title}" loading="lazy">
                            <button class="card-favorite-btn ${isFavorite(game.title) ? 'active' : ''}" onclick="event.stopPropagation(); toggleCardFavorite('${game.title}', this)">
                                <div class="card-heart"></div>
                            </button>
                        </div>
                        <div class="game-info">
                            ${game.fully_russian ? 
                                '<div class="russian-badge"><div class="russian-flag"><div class="russian-flag-red"></div></div>Полностью на русском</div>' : 
                                (game.has_russian_text ? '<div class="russian-subtitle-badge"><div class="russian-subtitle-flag"><div class="russian-subtitle-flag-red"></div></div>Русские субтитры</div>' : 
                                (game.no_russian_language ? '<div class="no-russian-badge"><div class="usa-flag"></div>Возможно отсутствие русского</div>' : ''))}
                            <h3 class="game-title">${game.title} <span style="color: #666; font-size: 0.85em;">${game.platforms ? `[${replaceNaN(game.platforms)}]` : ''}</span></h3>
                            ${createStars(game.rating) ? `<div class="rating-stars">
                                ${createStars(game.rating)}
                            </div>` : ''}
                            <div class="game-genre">${replaceNaN(game.genre) || 'Без жанра'}</div>
                            <div class="price-section">
                                ${hasDiscount ? 
                                    `<span class="old-price">${Math.round(parseFloat(game.price_rub))} ₽</span>
                                     <span class="price">${displayPrice}</span>` :
                                    `<span class="price">${displayPrice}</span>`
                                }
                                <button class="buy-button" onclick="event.stopPropagation(); window.open('${game.link}', '_blank')">Купить</button>
                            </div>
                            ${hasDiscount && game.discount_end && game.discount_end.trim() !== '' ? 
                                `<div class="countdown-timer">
                                    <div class="countdown-label">Скидка заканчивается через:</div>
                                    <div class="countdown-time" data-end="${game.discount_end}">${calculateCountdown(game.discount_end)}</div>
                                </div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            updateStats();
            displayPagination();
            startCountdownUpdates();
        }
        
        // Модальное окно
        function showModal(index) {
            const game = filteredGames[index];
            const modal = document.getElementById('gameModal');
            currentGameIndex = index;
            
            document.getElementById('modalTitle').textContent = game.title;
            
            // Бейджи языков
            let languageBadgesHtml = '';
            if (game.fully_russian) {
                languageBadgesHtml = '<div class="russian-badge"><div class="russian-flag"><div class="russian-flag-red"></div></div>Полностью на русском</div>';
            } else if (game.has_russian_text) {
                languageBadgesHtml = '<div class="russian-subtitle-badge"><div class="russian-subtitle-flag"><div class="russian-subtitle-flag-red"></div></div>Русские субтитры</div>';
            } else if (game.no_russian_language) {
                languageBadgesHtml = '<div class="no-russian-badge"><div class="usa-flag"></div>Возможно отсутствие русского</div>';
            }
            document.getElementById('modalLanguageBadges').innerHTML = languageBadgesHtml;
            
            // Рейтинг
            const ratingHtml = createStars(game.rating);
            if (ratingHtml) {
                document.getElementById('modalRating').innerHTML = ratingHtml;
                document.getElementById('modalRating').style.display = 'flex';
            } else {
                document.getElementById('modalRating').style.display = 'none';
            }
            
            // Кнопка избранного
            const favoriteBtn = document.getElementById('modalFavoriteBtn');
            if (isFavorite(game.title)) {
                favoriteBtn.classList.add('active');
                favoriteBtn.querySelector('.heart').textContent = '♥';
            } else {
                favoriteBtn.classList.remove('active');
                favoriteBtn.querySelector('.heart').textContent = '♡';
            }
            
            document.getElementById('modalImage').src = game.image;
            document.getElementById('modalPublisher').textContent = replaceNaN(game.publisher) || '—';
            document.getElementById('modalGenre').textContent = replaceNaN(game.genre) || '—';
            document.getElementById('modalPlatforms').textContent = replaceNaN(game.platforms) || '—';
            document.getElementById('modalRelease').textContent = replaceNaN(game.release_date) || '—';
            document.getElementById('modalVoice').textContent = replaceNaN(game.voice) || '—';
            document.getElementById('modalText').textContent = replaceNaN(game.text) || '—';
            
            const hasDiscount = game.discount_price_rub && game.discount_price_rub !== game.price_rub;
            const price = hasDiscount ? game.discount_price_rub : game.price_rub;
            const displayPrice = price === 'Free' ? 'Бесплатно' : `${Math.round(parseFloat(price))} ₽`;
            
            let priceHtml = '';
            if (hasDiscount) {
                const cleanDiscount = game.discount_percent ? game.discount_percent.replace(/-/g, '').replace(/%/g, '').trim() : '';
                priceHtml = `
                    <span class="old-price">${Math.round(parseFloat(game.price_rub))} ₽</span>
                    <span class="price">${displayPrice}</span>
                    ${cleanDiscount ? `<span class="modal-discount">Скидка ${cleanDiscount}%</span>` : ''}
                `;
            } else {
                priceHtml = `<span class="price">${displayPrice}</span>`;
            }
            document.getElementById('modalPrice').innerHTML = priceHtml;
            
            const countdownContainer = document.getElementById('modalCountdownContainer');
            if (hasDiscount && game.discount_end) {
                countdownContainer.innerHTML = `
                    <div class="modal-countdown">
                        <div class="modal-countdown-label">Скидка заканчивается через:</div>
                        <div class="modal-countdown-time" data-end="${game.discount_end}">${calculateCountdown(game.discount_end)}</div>
                    </div>
                `;
            } else {
                countdownContainer.innerHTML = '';
            }
            
            modal.style.display = 'block';
        }
        
        // Закрытие модального окна
        document.querySelector('.close').onclick = function() {
            document.getElementById('gameModal').style.display = 'none';
        }
        window.onclick = function(event) {
            const modal = document.getElementById('gameModal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
        
        // Фильтры
        function applyFilters() {
            const topSearch = document.getElementById('topSearchInput').value.toLowerCase();
            const genre = document.getElementById('genreFilter').value;
            const year = document.getElementById('yearFilter').value;
            const platform = document.getElementById('platformFilter').value;
            const rating = document.getElementById('ratingFilter').value;
            const filterFullRussian = document.getElementById('filterFullRussian').checked;
            const filterRussianText = document.getElementById('filterRussianText').checked;
            const discountOnly = document.getElementById('discountFilter').classList.contains('active');
            const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
            const maxPrice = parseFloat(document.getElementById('maxPrice').value) || 25000;
            
            filteredGames = gamesData.filter(game => {
                // Поиск с транслитерацией
                if (!smartSearch(game.title, topSearch)) return false;
                
                if (genre && game.genre !== genre) return false;
                if (year && !game.release_date.includes(year)) return false;
                if (platform) {
                    const gamePlatforms = game.platforms.toLowerCase();
                    if (platform === 'PS5' && !gamePlatforms.includes('ps5')) return false;
                    if (platform === 'PS4' && !gamePlatforms.includes('ps4')) return false;
                    if (platform === 'PS4/PS5' && !(gamePlatforms.includes('ps4') && gamePlatforms.includes('ps5'))) return false;
                }
                if (rating && game.rating < parseFloat(rating)) return false;
                
                // Фильтр по русскому языку (галочки)
                if (filterFullRussian && !game.fully_russian) return false;
                if (filterRussianText && !game.has_russian_text) return false;
                
                if (discountOnly && (!game.discount_price_rub || game.discount_price_rub === game.price_rub)) return false;
                if (showFavoritesOnly && !isFavorite(game.title)) return false;
                
                // Фильтр по цене - исключаем бесплатные игры
                const gamePriceRub = game.discount_price_rub && game.discount_price_rub !== 'nan' && game.discount_price_rub !== game.price_rub 
                    ? game.discount_price_rub : game.price_rub;
                const gamePrice = parseFloat(gamePriceRub) || 0;
                
                // Если применен фильтр цены (не дефолтные значения), исключаем бесплатные
                if (minPrice > 100 || maxPrice < 25000) {
                    if (gamePriceRub === 'Free' || gamePriceRub === 'free' || gamePrice === 0) return false;
                }
                
                if (gamePrice > 0 && (gamePrice < minPrice || gamePrice > maxPrice)) return false;
                
                return true;
            });
            
            // Сортировка по новинкам если активна
            if (sortByNovelty) {
                filteredGames.sort((a, b) => {
                    const dateA = parseReleaseDate(a.release_date);
                    const dateB = parseReleaseDate(b.release_date);
                    return dateB - dateA; // От новых к старым
                });
            }
            
            currentPage = 1;
            displayGames();
        }
        
        // Пагинация
        function displayPagination() {
            const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
            const pagination = document.getElementById('pagination');
            
            if (totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }
            
            let html = `
                <button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>←</button>
            `;
            
            const showPages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
            let endPage = Math.min(totalPages, startPage + showPages - 1);
            
            if (endPage - startPage < showPages - 1) {
                startPage = Math.max(1, endPage - showPages + 1);
            }
            
            if (startPage > 1) {
                html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
                if (startPage > 2) html += `<span style="padding: 10px; color: #666;">...</span>`;
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += `<span style="padding: 10px; color: #666;">...</span>`;
                html += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
            }
            
            html += `
                <button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>→</button>
            `;
            
            pagination.innerHTML = html;
        }
        
        function changePage(page) {
            currentPage = page;
            displayGames();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Статистика
        function updateStats() {
            const discountCount = gamesData.filter(g => g.discount_price_rub && g.discount_price_rub !== g.price_rub).length;
            const russianCount = gamesData.filter(g => g.has_russian_voice || g.has_russian_text).length;
            document.getElementById('totalGames').textContent = gamesData.length.toLocaleString();
            document.getElementById('discountGames').textContent = discountCount.toLocaleString();
            document.getElementById('russianGames').textContent = russianCount.toLocaleString();
            document.getElementById('shownGames').textContent = filteredGames.length.toLocaleString();
        }
        
        // Обновление таймеров
        function startCountdownUpdates() {
            setInterval(() => {
                document.querySelectorAll('[data-end]').forEach(el => {
                    const endDate = el.getAttribute('data-end');
                    el.textContent = calculateCountdown(endDate);
                });
            }, 1000);
        }
        
        // Инициализация фильтров
        function initFilters() {
            // Жанры - убираем "nan", сортируем (русские первыми) и добавляем счетчики
            const genreCounts = {};
            gamesData.forEach(g => {
                if (g.genre && g.genre !== 'nan' && g.genre !== 'NaN' && g.genre.trim() !== '') {
                    genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1;
                }
            });
            
            const genres = Object.keys(genreCounts)
                .sort((a, b) => {
                    const aIsRussian = /[а-яА-ЯЁё]/.test(a);
                    const bIsRussian = /[а-яА-ЯЁё]/.test(b);
                    if (aIsRussian && !bIsRussian) return -1;
                    if (!aIsRussian && bIsRussian) return 1;
                    return a.localeCompare(b, 'ru');
                });
            
            const genreSelect = document.getElementById('genreFilter');
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = `${genre} (${genreCounts[genre]})`;
                genreSelect.appendChild(option);
            });
            
            // Годы
            const years = [...new Set(gamesData.map(g => {
                const match = g.release_date.match(/\d{4}/);
                return match ? match[0] : null;
            }).filter(y => y))].sort().reverse();
            const yearSelect = document.getElementById('yearFilter');
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        }
        
        // События
        document.getElementById('topSearchInput').addEventListener('input', applyFilters);
        document.getElementById('genreFilter').addEventListener('change', applyFilters);
        document.getElementById('yearFilter').addEventListener('change', applyFilters);
        document.getElementById('platformFilter').addEventListener('change', applyFilters);
        document.getElementById('ratingFilter').addEventListener('change', applyFilters);
        
        // Галочки для русского языка
        document.getElementById('filterFullRussian').addEventListener('change', applyFilters);
        document.getElementById('filterRussianText').addEventListener('change', applyFilters);
        
        // Фильтр цены - синхронизация ползунков и инпутов
        document.getElementById('minPrice').addEventListener('input', function() {
            document.getElementById('minPriceSlider').value = this.value;
            applyFilters();
        });
        document.getElementById('maxPrice').addEventListener('input', function() {
            document.getElementById('maxPriceSlider').value = this.value;
            applyFilters();
        });
        document.getElementById('minPriceSlider').addEventListener('input', function() {
            document.getElementById('minPrice').value = this.value;
            applyFilters();
        });
        document.getElementById('maxPriceSlider').addEventListener('input', function() {
            document.getElementById('maxPrice').value = this.value;
            applyFilters();
        });
        
        document.getElementById('discountFilter').addEventListener('click', function() {
            this.classList.toggle('active');
            applyFilters();
        });
        
        document.getElementById('noveltyFilter').addEventListener('click', function() {
            this.classList.toggle('active');
            sortByNovelty = !sortByNovelty;
            applyFilters();
        });
        
        document.getElementById('favoritesFilter').addEventListener('click', function() {
            this.classList.toggle('active');
            showFavoritesOnly = !showFavoritesOnly;
            updateFavoritesBanner();
            applyFilters();
        });
        
        // Функция для возврата ко всем играм
        function backToAllGames() {
            showFavoritesOnly = false;
            document.getElementById('favoritesFilter').classList.remove('active');
            updateFavoritesBanner();
            applyFilters();
        }
        
        // Обновление баннера избранного
        function updateFavoritesBanner() {
            const banner = document.getElementById('favoritesBanner');
            const mainContent = document.querySelector('.main-content');
            
            if (showFavoritesOnly) {
                banner.classList.add('active');
                mainContent.classList.add('favorites-mode');
            } else {
                banner.classList.remove('active');
                mainContent.classList.remove('favorites-mode');
            }
        }
        
        
        document.getElementById('resetFilters').addEventListener('click', function() {
            document.getElementById('topSearchInput').value = '';
            document.getElementById('genreFilter').value = '';
            document.getElementById('yearFilter').value = '';
            document.getElementById('platformFilter').value = '';
            document.getElementById('ratingFilter').value = '';
            document.getElementById('filterFullRussian').checked = false;
            document.getElementById('filterRussianText').checked = false;
            document.getElementById('minPrice').value = '100';
            document.getElementById('maxPrice').value = '25000';
            document.getElementById('minPriceSlider').value = '100';
            document.getElementById('maxPriceSlider').value = '25000';
            document.getElementById('discountFilter').classList.remove('active');
            document.getElementById('noveltyFilter').classList.remove('active');
            document.getElementById('favoritesFilter').classList.remove('active');
            sortByNovelty = false;
            showFavoritesOnly = false;
            updateFavoritesBanner();
            applyFilters();
        });
        
        // Управление крестиком очистки поиска
        document.getElementById('topSearchInput').addEventListener('input', function() {
            const clearBtn = document.getElementById('searchClear');
            if (this.value.length > 0) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }
        });
        
        document.getElementById('searchClear').addEventListener('click', function() {
            document.getElementById('topSearchInput').value = '';
            this.classList.remove('visible');
            applyFilters();
        });
        
        
        // Инициализация при загрузке страницы
        window.addEventListener('load', function() {
            // Данные уже загружены из catalog-data.js
            filteredGames = [...gamesData];
            initFilters();
            displayGames();
            
            // Скрываем загрузочный экран
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
            }, 300);
        });

    