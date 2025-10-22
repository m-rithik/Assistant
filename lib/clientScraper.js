// Client-Side Scraper for Mess Menu
// This runs in the browser, not on the server

export class ClientMessScraper {
  constructor() {
    this.isClient = typeof window !== 'undefined';
  }

  // Check if we can use client-side scraping
  canUseClientScraping() {
    return this.isClient && window.navigator && window.navigator.userAgent;
  }

  // Fetch mess menu using client-side approach
  async scrapeMessMenu(hostelType = 'MH', messType = 'Non-Veg', dayNumber = null) {
    if (!this.canUseClientScraping()) {
      throw new Error('Client-side scraping not available');
    }

    try {
      console.log('🌐 Starting client-side mess menu scraping...');
      
      // Use a CORS proxy or direct fetch if CORS allows
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const targetUrl = 'https://messit.vinnovateit.com/details';
      
      const response = await fetch(proxyUrl + targetUrl, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log('✅ HTML fetched, length:', html.length);

      // Parse HTML using DOMParser (browser native)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract mess menu data
      const menuData = this.extractMenuFromHTML(doc, dayNumber);
      
      console.log('✅ Menu extracted:', menuData);
      return menuData;

    } catch (error) {
      console.error('❌ Client scraping failed:', error);
      throw error;
    }
  }

  // Extract menu data from HTML
  extractMenuFromHTML(doc, dayNumber) {
    const meals = {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: []
    };

    try {
      // Look for meal sections in the HTML
      const mealSections = doc.querySelectorAll('section.grid > div, .meal-section, [class*="meal"]');
      
      console.log('Found meal sections:', mealSections.length);

      mealSections.forEach((section, index) => {
        const titleElement = section.querySelector('h2, h3, .meal-title, [class*="title"]');
        const itemsElement = section.querySelector('p, .meal-items, [class*="items"]');
        
        if (!titleElement || !itemsElement) return;

        const title = titleElement.textContent.trim().toLowerCase();
        const items = itemsElement.textContent
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);

        // Map to meal types
        if (title.includes('breakfast')) {
          meals.breakfast = items;
        } else if (title.includes('lunch')) {
          meals.lunch = items;
        } else if (title.includes('snacks') || title.includes('snack')) {
          meals.snacks = items;
        } else if (title.includes('dinner')) {
          meals.dinner = items;
        }
      });

      // Generate available dates
      const availableDates = this.generateAvailableDates();

      return {
        meals,
        availableDates,
        isRealTime: true,
        source: 'client-side'
      };

    } catch (error) {
      console.error('Error extracting menu:', error);
      return {
        meals: { breakfast: [], lunch: [], snacks: [], dinner: [] },
        availableDates: [],
        isRealTime: false,
        source: 'error'
      };
    }
  }

  // Generate available dates for the current month
  generateAvailableDates() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayDay = today.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const availableDates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      availableDates.push({
        dayNumber: day,
        isToday: day === todayDay,
        date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      });
    }

    return availableDates;
  }

  // Alternative: Use iframe approach (if CORS blocks direct fetch)
  async scrapeWithIframe(hostelType, messType, dayNumber) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'https://messit.vinnovateit.com/details';
      
      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const menuData = this.extractMenuFromHTML(iframeDoc, dayNumber);
          document.body.removeChild(iframe);
          resolve(menuData);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };

      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Failed to load iframe'));
      };

      document.body.appendChild(iframe);
    });
  }
}

// Export singleton instance
export const clientScraper = new ClientMessScraper();
