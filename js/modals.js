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

export function openHistoryModal(historyModal, historyBody, historyItems, youPlayer, canSeeEvent, formatTime, setRoleBannerVisibility) {
    if (!historyModal) return;

    historyModal.style.display = 'flex';
    setRoleBannerVisibility(false);

    // Render history items
    renderHistory();

    function renderHistory() {
        if (!historyBody) return;
        historyBody.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.gap = '8px';

        // Debug logging
        console.log('History items:', historyItems);
        console.log('You player:', youPlayer);
        console.log('Total history items:', (historyItems || []).length);

        let visibleItems = (historyItems || []).filter(evt => canSeeEvent(evt, youPlayer));
        console.log('Visible items after canSeeEvent:', visibleItems.length);

        // Deduplicate consecutive identical messages and filter out noise
        const deduplicatedItems = [];
        const skipMessages = [
            'Game in progress',
            'Waiting for the President to nominate a Chancellor…',
            'Waiting for the President to draw policy cards…',
            'Order created',
            'Roles assigned',
            'Chancellor vote began',
        ];

        for (let i = 0; i < visibleItems.length; i++) {
            const current = visibleItems[i];
            const currentMsg = (current.message || '').trim();

            // Skip noise messages
            if (skipMessages.includes(currentMsg)) {
                console.log('Skipping noise message:', currentMsg);
                continue;
            }

            // Skip "Your role:" messages
            if (currentMsg.startsWith('Your role:')) {
                console.log('Skipping role message:', currentMsg);
                continue;
            }

            // Skip "Game started: roles assigned. Initial President:" messages - we keep the specific role messages instead
            if (currentMsg.startsWith('Game started: roles assigned.')) {
                console.log('Skipping game started message:', currentMsg);
                continue;
            }

            // Skip if identical to previous message
            const prev = deduplicatedItems[deduplicatedItems.length - 1];
            if (prev && prev.message === currentMsg) {
                console.log('Skipping duplicate message:', currentMsg);
                continue;
            }

            // Filter out redundant "Chancellor nominated:" messages if we already have "President nominated X as Chancellor"
            if (currentMsg.startsWith('Chancellor nominated:')) {
                console.log('Skipping Chancellor nominated message:', currentMsg);
                continue;
            }

            // Filter out player-specific nomination prompts like "Allison: Nominate a Chancellor"
            if (currentMsg.includes(': Nominate a Chancellor')) {
                console.log('Skipping nomination prompt:', currentMsg);
                continue;
            }

            console.log('Keeping message:', currentMsg);
            deduplicatedItems.push(current);
        }

        visibleItems = deduplicatedItems;

        console.log('Visible items after filter:', visibleItems.length);
        console.log('Final visible items:', visibleItems.map(v => v.message));

        if (visibleItems.length === 0) {
            const p = document.createElement('p');
            const totalItems = (historyItems || []).length;
            if (totalItems === 0) {
                p.textContent = 'No history yet. History will be recorded as the game progresses.';
            } else {
                p.textContent = `No visible history (${totalItems} total events exist but are filtered).`;
            }
            historyBody.appendChild(p);
            return;
        }

        // Reverse to show most recent first and group voting events
        const reversedItems = visibleItems.reverse();
        let i = 0;

        while (i < reversedItems.length) {
            const evt = reversedItems[i];
            const msg = evt.message || '';

            // Check if this is a vote result message
            const msgLower = msg.toLowerCase();
            if ((msgLower.includes('election passed') || msgLower.includes('election failed')) ||
                ((msgLower.includes('elected') || msgLower.includes('rejected')) &&
                 (msgLower.includes('ja') || msgLower.includes('nein') || msgLower.includes('votes')))) {

                // This is a vote result - collect all related vote messages
                const voteGroup = [evt];
                let j = i + 1;

                // Look ahead for individual vote messages
                while (j < reversedItems.length) {
                    const nextMsg = (reversedItems[j].message || '').toLowerCase();
                    if (nextMsg.includes('voted ja') || nextMsg.includes('voted nein') || nextMsg.includes('voted')) {
                        voteGroup.push(reversedItems[j]);
                        j++;
                    } else {
                        break;
                    }
                }

                // Create collapsible vote group if there are individual votes
                if (voteGroup.length > 1) {
                    const groupContainer = document.createElement('div');
                    groupContainer.className = 'history-vote-group';

                    // Main vote result row (always visible)
                    const mainRow = document.createElement('div');
                    mainRow.className = 'order-item history-vote-main';
                    mainRow.style.cursor = 'pointer';

                    const left = document.createElement('div');
                    left.className = 'order-left';
                    const time = document.createElement('div');
                    time.className = 'history-time';
                    time.textContent = formatTime(evt.ts);
                    const msgDiv = document.createElement('div');
                    msgDiv.style.fontWeight = '800';
                    msgDiv.style.flex = '1';
                    msgDiv.textContent = evt.message || '';
                    const arrow = document.createElement('span');
                    arrow.className = 'history-vote-arrow';
                    arrow.textContent = '▼';
                    arrow.style.marginLeft = '8px';
                    left.appendChild(time);
                    left.appendChild(msgDiv);
                    left.appendChild(arrow);
                    mainRow.appendChild(left);

                    const right = document.createElement('div');
                    right.className = 'order-right';
                    const tag = document.createElement('span');
                    tag.className = 'badge-pres';
                    tag.textContent = (evt.visibility || 'public').toUpperCase();
                    const countBadge = document.createElement('span');
                    countBadge.className = 'badge-chanc';
                    countBadge.textContent = `${voteGroup.length - 1} votes`;
                    countBadge.style.marginLeft = '6px';
                    right.appendChild(tag);
                    right.appendChild(countBadge);
                    mainRow.appendChild(right);

                    groupContainer.appendChild(mainRow);

                    // Individual votes (hidden by default)
                    const votesContainer = document.createElement('div');
                    votesContainer.className = 'history-vote-details';
                    votesContainer.style.display = 'none';
                    votesContainer.style.paddingLeft = '20px';

                    for (let k = 1; k < voteGroup.length; k++) {
                        const voteEvt = voteGroup[k];
                        const voteRow = document.createElement('div');
                        voteRow.className = 'order-item';
                        voteRow.style.background = 'rgba(246, 240, 223, 0.3)';
                        voteRow.style.borderStyle = 'dotted';

                        const vLeft = document.createElement('div');
                        vLeft.className = 'order-left';
                        const vTime = document.createElement('div');
                        vTime.className = 'history-time';
                        vTime.textContent = formatTime(voteEvt.ts);
                        const vMsg = document.createElement('div');
                        vMsg.style.fontWeight = '600';
                        vMsg.style.flex = '1';
                        vMsg.style.fontSize = '0.9em';
                        vMsg.textContent = voteEvt.message || '';
                        vLeft.appendChild(vTime);
                        vLeft.appendChild(vMsg);
                        voteRow.appendChild(vLeft);

                        votesContainer.appendChild(voteRow);
                    }

                    groupContainer.appendChild(votesContainer);

                    // Toggle functionality
                    mainRow.addEventListener('click', () => {
                        const isVisible = votesContainer.style.display !== 'none';
                        votesContainer.style.display = isVisible ? 'none' : 'block';
                        arrow.textContent = isVisible ? '▼' : '▲';
                    });

                    wrap.appendChild(groupContainer);
                    i = j; // Skip all the votes we just processed
                    continue;
                }
            }

            // Regular event (not part of a vote group)
            const row = document.createElement('div');
            row.className = 'order-item';
            const left = document.createElement('div');
            left.className = 'order-left';
            const time = document.createElement('div');
            time.className = 'history-time';
            time.textContent = formatTime(evt.ts);
            const msgDiv = document.createElement('div');
            msgDiv.style.fontWeight = '800';
            msgDiv.style.flex = '1';
            msgDiv.textContent = evt.message || '';
            left.appendChild(time);
            left.appendChild(msgDiv);
            row.appendChild(left);

            const right = document.createElement('div');
            right.className = 'order-right';
            const tag = document.createElement('span');
            tag.className = 'badge-pres';
            tag.textContent = (evt.visibility || 'public').toUpperCase();
            right.appendChild(tag);
            row.appendChild(right);

            wrap.appendChild(row);
            i++;
        }

        historyBody.appendChild(wrap);
    }
}

export function closeHistoryModal(historyModal, setRoleBannerVisibility) {
    if (historyModal) historyModal.style.display = 'none';
    setRoleBannerVisibility(true);
}
