// Modal-related functions for Secret Hitler game
// These functions handle modal opening/closing and are mostly self-contained

export function openOrderModal(latestPlayers, latestGame, orderBody, orderModal, setRoleBannerVisibility) {
    if (!orderBody || !orderModal) return;
    
    orderBody.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'order-list';
    
    if (!latestPlayers || latestPlayers.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'Player order not available yet.';
        orderBody.appendChild(p);
    } else {
        latestPlayers.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'order-item';
            const left = document.createElement('div');
            left.className = 'order-left';
            const num = document.createElement('div');
            num.className = 'order-num';
            num.textContent = String(idx + 1);
            const name = document.createElement('div');
            name.style.fontWeight = '800';
            name.textContent = p.name || 'Player';
            left.appendChild(num);
            left.appendChild(name);
            row.appendChild(left);

            const right = document.createElement('div');
            right.className = 'order-right';
            if (latestGame && latestGame.currentPresidentPlayerId === p.id) {
                const pres = document.createElement('span');
                pres.className = 'badge-pres';
                pres.textContent = '👑 President';
                right.appendChild(pres);
            }
            if (latestGame && latestGame.currentChancellorPlayerId === p.id) {
                const chanc = document.createElement('span');
                chanc.className = 'badge-chanc';
                chanc.textContent = '🔨 Chancellor';
                right.appendChild(chanc);
            }
            // During an active vote, indicate who has voted
            if (latestGame && latestGame.nominatedChancellorPlayerId) {
                const evotes = (latestGame.electionVotes && typeof latestGame.electionVotes === 'object') ? latestGame.electionVotes : {};
                if (evotes && Object.prototype.hasOwnProperty.call(evotes, p.id)) {
                    const voted = document.createElement('span');
                    voted.className = 'badge-pres';
                    voted.textContent = 'VOTED';
                    right.appendChild(voted);
                }
            }
            row.appendChild(right);
            list.appendChild(row);
        });
        orderBody.appendChild(list);
    }
    orderModal.style.display = 'flex';
    setRoleBannerVisibility(false);
}

export function closeOrderModal(orderModal, setRoleBannerVisibility) {
    if (orderModal) orderModal.style.display = 'none';
    setRoleBannerVisibility(true);
}

export function openHistoryModal(historyModal, historyBody, historyUnsub, gid, onHistory, historyItems, canSeeEvent, formatTime, setRoleBannerVisibility) {
    if (!historyModal) return;
    
    console.log('Opening history modal for game:', gid);
    
    historyModal.style.display = 'flex';
    setRoleBannerVisibility(false);
    
    let localHistoryUnsub = historyUnsub;
    let localHistoryItems = historyItems || [];
    
    // Subscribe on open
    if (!localHistoryUnsub) {
        console.log('Creating new history subscription...');
        try {
            localHistoryUnsub = onHistory(gid, (items) => {
                console.log('History items received:', items);
                localHistoryItems = items || [];
                renderHistory();
            });
            console.log('History subscription created successfully');
        } catch (err) {
            console.error('Failed to create history subscription:', err);
        }
    } else {
        console.log('Using existing history subscription');
    }
    
    function renderHistory() {
        console.log('Rendering history, historyBody exists:', !!historyBody);
        if (!historyBody) return;
        historyBody.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.gap = '8px';

        console.log('Local history items:', localHistoryItems);
        const visibleItems = (localHistoryItems || []).filter(evt => canSeeEvent(evt));
        console.log('Visible items after filtering:', visibleItems);

        if (visibleItems.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No history yet.';
            historyBody.appendChild(p);
            return;
        }

        visibleItems.forEach((evt) => {
            const row = document.createElement('div');
            row.className = 'order-item';
            const left = document.createElement('div');
            left.className = 'order-left';
            const time = document.createElement('div');
            time.className = 'order-num';
            time.textContent = formatTime(evt.ts);
            const msg = document.createElement('div');
            msg.style.fontWeight = '800';
            msg.textContent = evt.message || '';
            left.appendChild(time);
            left.appendChild(msg);
            row.appendChild(left);

            const right = document.createElement('div');
            right.className = 'order-right';
            const tag = document.createElement('span');
            tag.className = 'badge-pres';
            tag.textContent = (evt.visibility || 'public').toUpperCase();
            right.appendChild(tag);
            row.appendChild(right);

            wrap.appendChild(row);
        });
        historyBody.appendChild(wrap);
    }
    
    renderHistory();
    
    // Return the subscription so it can be maintained
    return localHistoryUnsub;
}

export function closeHistoryModal(historyModal, setRoleBannerVisibility, historyUnsub) {
    if (historyModal) historyModal.style.display = 'none';
    setRoleBannerVisibility(true);
    // Don't unsubscribe here - keep the subscription active
}
