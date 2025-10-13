// auth.js - Cloud-first autentiseringsmodul
// Innloggede brukere leser/skriver direkte til/fra cloud, ikke localStorage

(function() {
  'use strict';
  
  const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || '';
  const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || '';
  
  // Storage keys
  const STORAGE_KEYS = {
    TASKS: 'tt_kappa_tasks_v3',
    ITEMS: 'tt_quest_items_v3',
    HIDEOUT: 'tt_hideout_items_v3',
    SELECTED_LEVELS: 'tt_hideout_selected_levels_v1',
    COMPLETED_LEVELS: 'hideout_completed_levels',
    UNDO: 'tt_kappa_undo_v3',
    SELECTED_QUESTLINE: 'selected_questline',
    USER_ID: 'tarkov_user_id',
    LAST_SYNC: 'last_sync_timestamp',
    AUTH_SYNCED: '_auth_initial_sync_done'
  };
  
  let supabaseClient = null;
  let currentUser = null;
  let cloudDataCache = {};
  
  // Initialiser Supabase
  function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === '' || SUPABASE_ANON_KEY === '') {
      console.warn('[Auth] Supabase ikke konfigurert - kjører i offline modus');
      return false;
    }
    
    if (typeof supabase === 'undefined') {
      console.warn('[Auth] Supabase library ikke lastet');
      return false;
    }
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Auth] Supabase initialisert');
    return true;
  }
  
  // Hent brukerdata
  async function getCurrentUser() {
    if (!supabaseClient) return null;
    
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        currentUser = session.user;
        return currentUser;
      }
    } catch (error) {
      console.error('[Auth] Feil ved henting av bruker:', error);
    }
    return null;
  }
  
  // Last ALL brukerdata fra cloud til cache
  async function loadAllCloudData() {
    if (!supabaseClient || !currentUser) return false;
    
    try {
      console.log('[Auth] Laster ALL cloud-data...');
      
      const { data, error } = await supabaseClient
        .from('user_data')
        .select('data_key, data_value')
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      cloudDataCache = {};
      
      if (data && data.length > 0) {
        for (const row of data) {
          cloudDataCache[row.data_key] = row.data_value;
        }
        console.log(`[Auth] Lastet ${data.length} keys fra cloud`);
      } else {
        console.log('[Auth] Ingen cloud-data funnet - initialiserer tomme verdier');
        // Initialiser med tomme verdier
        cloudDataCache[STORAGE_KEYS.TASKS] = '{}';
        cloudDataCache[STORAGE_KEYS.ITEMS] = '{}';
        cloudDataCache[STORAGE_KEYS.HIDEOUT] = '{}';
        cloudDataCache[STORAGE_KEYS.COMPLETED_LEVELS] = '{}';
        cloudDataCache[STORAGE_KEYS.UNDO] = '[]';
        cloudDataCache[STORAGE_KEYS.SELECTED_QUESTLINE] = 'kappa';
      }
      
      return true;
    } catch (error) {
      console.error('[Auth] Feil ved lasting av cloud-data:', error);
      return false;
    }
  }
  
  // Lagre data til Supabase
  async function saveToCloud(key, data) {
    if (!supabaseClient || !currentUser) return false;
    
    try {
      const { error } = await supabaseClient
        .from('user_data')
        .upsert({
          user_id: currentUser.id,
          data_key: key,
          data_value: data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,data_key'
        });
      
      if (error) throw error;
      
      // Oppdater cache
      cloudDataCache[key] = data;
      
      console.log(`[Auth] Lagret ${key} til cloud`);
      return true;
    } catch (error) {
      console.error('[Auth] Feil ved lagring til cloud:', error);
      return false;
    }
  }
  
  // Les data - fra cache hvis innlogget, localStorage hvis ikke
  function getData(key) {
    if (currentUser && cloudDataCache) {
      const value = cloudDataCache[key];
      return value || null;
    }
    return localStorage.getItem(key);
  }
  
  // Skriv data - til cloud hvis innlogget, localStorage hvis ikke
  async function setData(key, value) {
    if (currentUser) {
      return await saveToCloud(key, value);
    } else {
      localStorage.setItem(key, value);
      return true;
    }
  }
  
  // Logg ut
  async function signOut() {
    if (!supabaseClient) return;
    
    try {
      await supabaseClient.auth.signOut();
      currentUser = null;
      cloudDataCache = {};
      localStorage.removeItem(STORAGE_KEYS.AUTH_SYNCED);
      console.log('[Auth] Bruker logget ut');
      return true;
    } catch (error) {
      console.error('[Auth] Feil ved utlogging:', error);
      return false;
    }
  }
  
  // Vis brukerinfo i UI
  function updateUserUI() {
    const userInfoElements = document.querySelectorAll('[data-user-info]');
    
    userInfoElements.forEach(el => {
      if (currentUser) {
        const userName = currentUser.user_metadata?.full_name || 
                        currentUser.email?.split('@')[0] || 
                        'Bruker';
        const userAvatar = currentUser.user_metadata?.avatar_url || '';
        
        el.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            ${userAvatar ? `<img src="${userAvatar}" alt="${userName}" style="width:28px;height:28px;border-radius:50%;"/>` : ''}
            <span style="color:var(--txt);font-weight:600;">${userName}</span>
            <button id="btnLogout" class="btn ghost" style="font-size:12px;padding:4px 8px;">Logg ut</button>
          </div>
        `;
        
        const logoutBtn = el.querySelector('#btnLogout');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', async () => {
            if (confirm('Er du sikker på at du vil logge ut?')) {
              await signOut();
              window.location.reload();
            }
          });
        }
      } else {
        el.innerHTML = `
          <a href="login.html?return=${encodeURIComponent(window.location.pathname)}" class="btn ghost" style="text-decoration:none;">
            Logg inn
          </a>
        `;
      }
    });
  }
  
  // Vis synkroniseringsstatus
  function showSyncStatus(message, type = 'info') {
    const statusEl = document.querySelector('[data-sync-status]');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `sync-status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
  
  // Send event når auth er klar
  function notifyAuthReady() {
    const event = new CustomEvent('tarkovAuthReady', {
      detail: { 
        isLoggedIn: !!currentUser,
        timestamp: Date.now() 
      }
    });
    window.dispatchEvent(event);
    console.log('[Auth] Auth ready event sendt');
  }
  
  // Initialiser autentisering
  async function init() {
    const supabaseReady = initSupabase();
    
    if (!supabaseReady) {
      console.log('[Auth] Kjører i offline modus');
      updateUserUI();
      notifyAuthReady();
      return;
    }
    
    currentUser = await getCurrentUser();
    
    if (currentUser) {
      console.log('[Auth] Bruker innlogget:', currentUser.email);
      
      showSyncStatus('Laster data fra cloud...', 'info');
      const success = await loadAllCloudData();
      
      if (success) {
        localStorage.setItem(STORAGE_KEYS.AUTH_SYNCED, Date.now().toString());
        showSyncStatus('Data lastet fra cloud', 'success');
      } else {
        showSyncStatus('Feil ved lasting av data', 'error');
      }
      
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          currentUser = null;
          cloudDataCache = {};
          localStorage.removeItem(STORAGE_KEYS.AUTH_SYNCED);
          updateUserUI();
        } else if (event === 'SIGNED_IN' && session?.user) {
          currentUser = session.user;
          loadAllCloudData().then(() => {
            updateUserUI();
          });
        }
      });
    }
    
    updateUserUI();
    notifyAuthReady();
  }
  
  // Public API
  window.TarkovAuth = {
    init,
    getCurrentUser: () => currentUser,
    isLoggedIn: () => !!currentUser,
    signOut,
    getData,
    setData,
    // Legacy support (apps kan fortsatt bruke localStorage hvis ikke innlogget)
    saveToCloud,
    STORAGE_KEYS
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();