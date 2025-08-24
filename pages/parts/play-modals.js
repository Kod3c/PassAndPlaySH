// Modal Dialogs Module for Secret Hitler Play Page
export const ModalsModule = {
    // Get the HTML for all modals
    getHTML() {
        return `
<!-- Order Modal -->
<div id="order-modal" class="modal-overlay">
    <div class="modal-card">
        <div class="modal-header">
            <div class="modal-title">Player Order</div>
            <button id="order-close" class="modal-close" aria-label="Close">×</button>
        </div>
        <div id="order-body" class="modal-body"></div>
    </div>
</div>

<!-- History Modal -->
<div id="history-modal" class="modal-overlay">
    <div class="modal-card">
        <div class="modal-header">
            <div class="modal-title">History</div>
            <button id="history-close" class="modal-close" aria-label="Close">×</button>
        </div>
        <div id="history-body" class="modal-body"></div>
    </div>
</div>

<!-- Nomination Modal -->
<div id="nomination-modal" class="modal-overlay">
    <div class="modal-card">
        <div class="modal-header">
            <div class="modal-title">Choose Chancellor</div>
            <button id="nomination-close" class="modal-close" aria-label="Close">×</button>
        </div>
        <div id="nomination-body" class="modal-body"></div>
    </div>
</div>

<!-- Menu Modal -->
<div id="menu-modal" class="modal-overlay">
    <div class="modal-card">
        <div class="modal-header">
            <div class="modal-title">Menu</div>
            <button id="menu-close" class="modal-close" aria-label="Close">×</button>
        </div>
        <div id="menu-body" class="modal-body"></div>
    </div>
</div>

<!-- Role Overlay Modal -->
<div id="role-overlay" class="modal-overlay">
    <div class="modal-card">
        <div class="modal-header">
            <div class="modal-title">Your Secret Role</div>
            <button id="role-close" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
            <div class="role-content">
                <div class="role-display">
                    <div class="role-label" id="role-text">Hidden</div>
                </div>
                <div class="role-actions">
                    <button id="role-toggle-btn" class="btn btn-primary">👁️ Reveal my secret role</button>
                    <button id="role-done-btn" class="btn">✅ Close</button>
                </div>
            </div>
        </div>
    </div>
</div>`;
    },

    // Initialize modal behaviors
    init(callbacks = {}) {
        // Order modal handlers
        const orderBtn = document.getElementById('order-btn');
        const orderModal = document.getElementById('order-modal');
        const orderClose = document.getElementById('order-close');
        
        orderBtn?.addEventListener('click', callbacks.openOrderModal || (() => {}));
        orderClose?.addEventListener('click', callbacks.closeOrderModal || (() => { orderModal.style.display = 'none'; }));
        orderModal?.addEventListener('click', function(e) { 
            if (e.target === orderModal) {
                if (callbacks.closeOrderModal) callbacks.closeOrderModal();
                else orderModal.style.display = 'none';
            }
        });

        // History modal handlers
        const historyBtn = document.getElementById('history-btn');
        const historyModal = document.getElementById('history-modal');
        const historyClose = document.getElementById('history-close');
        
        historyBtn?.addEventListener('click', callbacks.openHistoryModal || (() => {}));
        historyClose?.addEventListener('click', callbacks.closeHistoryModal || (() => { historyModal.style.display = 'none'; }));
        historyModal?.addEventListener('click', function(e) { 
            if (e.target === historyModal) {
                if (callbacks.closeHistoryModal) callbacks.closeHistoryModal();
                else historyModal.style.display = 'none';
            }
        });

        // Nomination modal handlers
        const nominationModal = document.getElementById('nomination-modal');
        const nominationClose = document.getElementById('nomination-close');
        
        nominationClose?.addEventListener('click', callbacks.closeNominationModal || (() => { nominationModal.style.display = 'none'; }));
        nominationModal?.addEventListener('click', function(e) { 
            if (e.target === nominationModal) {
                if (callbacks.closeNominationModal) callbacks.closeNominationModal();
                else nominationModal.style.display = 'none';
            }
        });

        // Menu modal handlers
        const menuBtn = document.getElementById('menu-btn');
        const menuModal = document.getElementById('menu-modal');
        const menuClose = document.getElementById('menu-close');
        
        if (menuBtn) {
            menuBtn.addEventListener('click', function(e) {
                try { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); } catch (_) {}
                if (callbacks.openMenuModal) callbacks.openMenuModal();
            }, { capture: true });
        }
        menuClose?.addEventListener('click', callbacks.closeMenuModal || (() => { menuModal.style.display = 'none'; }));
        menuModal?.addEventListener('click', function(e) { 
            if (e.target === menuModal) {
                if (callbacks.closeMenuModal) callbacks.closeMenuModal();
                else menuModal.style.display = 'none';
            }
        });

        // Role overlay handlers
        const roleEnvelope = document.getElementById('role-envelope');
        const roleOverlay = document.getElementById('role-overlay');
        const roleClose = document.getElementById('role-close');
        
        roleEnvelope?.addEventListener('click', callbacks.openRoleOverlay || (() => {}));
        roleClose?.addEventListener('click', callbacks.closeRoleOverlay || (() => { roleOverlay.style.display = 'none'; }));
        roleOverlay?.addEventListener('click', function(e) { 
            if (e.target === roleOverlay) {
                if (callbacks.closeRoleOverlay) callbacks.closeRoleOverlay();
                else roleOverlay.style.display = 'none';
            }
        });

        // ESC key to close modals
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modals = [
                    { element: orderModal, callback: callbacks.closeOrderModal },
                    { element: historyModal, callback: callbacks.closeHistoryModal },
                    { element: nominationModal, callback: callbacks.closeNominationModal },
                    { element: menuModal, callback: callbacks.closeMenuModal },
                    { element: roleOverlay, callback: callbacks.closeRoleOverlay },
                    { element: document.getElementById('rules-modal'), callback: callbacks.closeRulesModal }
                ];
                
                modals.forEach(modal => {
                    if (modal.element && modal.element.style.display === 'flex') {
                        if (modal.callback) modal.callback();
                        else modal.element.style.display = 'none';
                    }
                });
            }
        });
    }
};

export default ModalsModule;