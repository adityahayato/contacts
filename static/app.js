const list = document.querySelector('#contact-list');
const emptyState = document.querySelector('#empty-state');
const modal = document.querySelector('#modal');
const form = document.querySelector('#contact-form');
const search = document.querySelector('#search');
const colors = [['#eeeaff','#675dd2'],['#e6f4ec','#43876b'],['#fff0e7','#bd8154'],['#e7f0fc','#5579b6'],['#fceaf0','#bc6682'],['#f4f0df','#9a8448']];

document.querySelector('#today').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function render(contacts) {
  const hasContacts = contacts.length > 0;
  list.innerHTML = contacts.map((contact, index) => {
    const [background, foreground] = colors[index % colors.length];
    return `<tr><td class="name-cell"><div class="person-cell"><span class="person-avatar" style="background:${background};color:${foreground}">${escapeHtml(initials(contact.name))}</span>${escapeHtml(contact.name)}</div></td><td>${escapeHtml(contact.mobile)}</td><td class="email-cell">${escapeHtml(contact.email || '—')}</td><td class="address-cell" title="${escapeHtml(contact.address)}">${escapeHtml(contact.address || '—')}</td><td class="row-menu"><button class="delete-button" data-id="${contact.id}" data-name="${escapeHtml(contact.name)}" aria-label="Delete ${escapeHtml(contact.name)}" title="Delete contact">🗑</button></td></tr>`;
  }).join('');
  list.querySelectorAll('.delete-button').forEach(button => button.addEventListener('click', deleteContact));
  emptyState.hidden = hasContacts;
  document.querySelector('#total-count').textContent = contacts.length;
  document.querySelector('#nav-count').textContent = contacts.length;
  document.querySelector('#section-count').textContent = contacts.length;
  document.querySelector('#result-count').textContent = `Showing ${contacts.length} contact${contacts.length === 1 ? '' : 's'}`;
  if (!hasContacts && search.value.trim()) {
    document.querySelector('#empty-title').textContent = 'No contacts found.';
    document.querySelector('#empty-copy').textContent = 'Try another name, number, or email address.';
    document.querySelector('#empty-add').hidden = true;
  } else {
    document.querySelector('#empty-title').textContent = 'Your address book is waiting.';
    document.querySelector('#empty-copy').textContent = 'Add your first contact and start building your little black book.';
    document.querySelector('#empty-add').hidden = false;
  }
}

async function deleteContact(event) {
  const button = event.currentTarget;
  const contactName = button.dataset.name;
  if (!window.confirm(`Delete ${contactName} from your contacts?`)) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/contacts/${button.dataset.id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not delete contact.');
    await loadContacts();
    const toast = document.querySelector('#toast');
    toast.textContent = `${contactName} was deleted`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
  } catch (error) {
    button.disabled = false;
    window.alert(error.message);
  }
}

async function loadContacts() {
  try {
    const response = await fetch(`/api/contacts?q=${encodeURIComponent(search.value.trim())}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load contacts.');
    render(data);
  } catch (error) {
    list.innerHTML = '';
    emptyState.hidden = false;
    document.querySelector('#empty-title').textContent = 'Could not connect to your contacts.';
    document.querySelector('#empty-copy').textContent = error.message;
    document.querySelector('#empty-add').hidden = true;
  }
}

function openModal() {
  form.reset();
  document.querySelector('#form-error').textContent = '';
  modal.hidden = false;
  requestAnimationFrame(() => form.elements.name.focus());
}

function closeModal() { modal.hidden = true; }
document.querySelector('#add-contact').addEventListener('click', openModal);
document.querySelector('#empty-add').addEventListener('click', openModal);
document.querySelector('#close-modal').addEventListener('click', closeModal);
document.querySelector('#cancel-modal').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); }
});
let searchTimer;
search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadContacts, 180); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.querySelector('#save-button');
  const errorBox = document.querySelector('#form-error');
  const values = Object.fromEntries(new FormData(form).entries());
  if (!/^\d{10}$/.test(values.mobile)) {
    errorBox.textContent = 'Mobile number must contain exactly 10 digits.';
    form.elements.mobile.focus();
    return;
  }
  if (values.email && !/^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(values.email)) {
    errorBox.textContent = 'Please enter a valid Gmail address ending in @gmail.com.';
    form.elements.email.focus();
    return;
  }
  button.disabled = true;
  button.textContent = 'Saving…';
  errorBox.textContent = '';
  try {
    const response = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not save contact.');
    closeModal();
    search.value = '';
    await loadContacts();
    const toast = document.querySelector('#toast');
    toast.textContent = `${data.name} added to your contacts`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Save contact <span>↗</span>';
  }
});

loadContacts();
