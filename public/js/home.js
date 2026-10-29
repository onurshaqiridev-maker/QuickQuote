// QuickQuote home page: the list of companies and the search box.
// Uses api(), el() and formatShortMoney() from common.js.

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const companyList = document.getElementById('company-list');
const companiesTitle = document.getElementById('companies-title');
const companiesMessage = document.getElementById('companies-message');

// One card per company: name, city, description, "From €55" and a link
function companyCard(company) {
  const item = el('li', 'company-card');
  const title = el('h3', '', company.name);
  const city = el('p', 'company-city', company.city);
  const description = el('p', 'company-description', company.description || 'Professional cleaning services.');
  const price = el('p', 'company-price', `From ${formatShortMoney(company.startingPrice)}`);

  const link = el('a', 'button', 'See prices');
  link.href = `/company.html?c=${encodeURIComponent(company.slug)}`;
  // Screen readers hear "See prices for Sparkle Home Cleaning", not just "See prices"
  link.setAttribute('aria-label', `See prices for ${company.name}`);

  item.append(title, city, description, price, link);
  return item;
}

async function loadCompanies(search) {
  companiesMessage.hidden = false;
  companiesMessage.textContent = 'Loading companies…';

  const result = await api('/api/companies?search=' + encodeURIComponent(search));
  companyList.innerHTML = '';

  if (!result.ok) {
    companiesMessage.textContent = result.data.error || 'Sorry, we could not load the companies.';
    return;
  }

  const companies = result.data;
  companiesTitle.textContent = search ? `Results for "${search}"` : 'All cleaning companies';
  if (companies.length === 0) {
    companiesMessage.textContent = search
      ? 'No companies match your search. Try another name or city.'
      : 'No companies are listed yet.';
    return;
  }
  companiesMessage.textContent = companies.length === 1 ? '1 company found.' : `${companies.length} companies found.`;
  companies.forEach((company) => companyList.appendChild(companyCard(company)));
}

// Search when the form is sent (Enter or the Search button)
searchForm.addEventListener('submit', (event) => {
  event.preventDefault(); // don't reload the page
  const search = searchInput.value.trim();
  // Put the search in the address (?search=skopje), so it can be shared or bookmarked
  const url = search ? `?search=${encodeURIComponent(search)}#companies` : '/#companies';
  history.replaceState(null, '', url);
  loadCompanies(search);
});

// When the search box is emptied with the "x", show all companies again
searchInput.addEventListener('search', () => {
  if (searchInput.value === '') {
    history.replaceState(null, '', '/');
    loadCompanies('');
  }
});

// On page load: use ?search=... from the address if there is one
const startSearch = new URLSearchParams(window.location.search).get('search') || '';
searchInput.value = startSearch;
loadCompanies(startSearch.trim());
