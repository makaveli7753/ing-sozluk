/* ============================================================
   İng-Tr Sözlük — Application Logic
   ============================================================ */

(function () {
    'use strict';

    // ─── State ───
    let dictionary = [];
    let myWords = [];
    let groups = [];
    let activeGroup = 'all';
    let quizState = null;
    let editingIndex = -1;
    let deletingIndex = -1;

    // ─── DOM Refs ───
    const $ = id => document.getElementById(id);

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Dictionary
    const dictSearch = $('dict-search');
    const dictClear = $('dict-clear');
    const dictList = $('dict-list');
    const dictEmpty = $('dict-empty');
    const dictCount = $('dict-count');

    // My Words
    const groupBar = $('group-bar');
    const addEn = $('add-en');
    const addTr = $('add-tr');
    const btnAdd = $('btn-add');
    const myWordsList = $('my-words-list');
    const mywordsEmpty = $('mywords-empty');
    const mywordsCount = $('mywords-count');
    const mywordsSearch = $('mywords-search');
    const btnExportJson = $('btn-export-json');
    const btnExportTxt = $('btn-export-txt');
    const btnImport = $('btn-import');
    const importFile = $('import-file');

    // Quiz
    const quizSetup = $('quiz-setup');
    const quizArea = $('quiz-area');
    const quizResults = $('quiz-results');
    const quizWordCount = $('quiz-word-count');
    const quizGroupSelect = $('quiz-group-select');
    const qCountOptions = $('q-count-options');
    const btnMC = $('btn-mc');
    const btnWrite = $('btn-write');
    const quizProgress = $('quiz-progress');
    const quizScoreLive = $('quiz-score-live');
    const quizProgressFill = $('quiz-progress-fill');
    const quizWord = $('quiz-word');
    const quizInstruction = $('quiz-instruction');
    const quizOptions = $('quiz-options');
    const quizInputArea = $('quiz-input-area');
    const quizAnswer = $('quiz-answer');
    const btnCheck = $('btn-check');
    const quizFeedback = $('quiz-feedback');
    const btnNext = $('btn-next');
    const resultScore = $('result-score');
    const resultWrongSection = $('result-wrong-section');
    const resultWrongList = $('result-wrong-list');
    const btnRestart = $('btn-restart');

    // Modals
    const editModal = $('edit-modal');
    const editEn = $('edit-en');
    const editTr = $('edit-tr');
    const editGroup = $('edit-group');
    const btnEditSave = $('btn-edit-save');
    const btnEditCancel = $('btn-edit-cancel');
    const groupModal = $('group-modal');
    const newGroupName = $('new-group-name');
    const btnGroupSave = $('btn-group-save');
    const btnGroupCancel = $('btn-group-cancel');
    const deleteModal = $('delete-modal');
    const deleteMsg = $('delete-msg');
    const btnDeleteConfirm = $('btn-delete-confirm');
    const btnDeleteCancel = $('btn-delete-cancel');

    // ─── Toast ───
    function showToast(message, type = '') {
        const toast = $('toast');
        toast.textContent = message;
        toast.className = 'toast' + (type ? ' toast-' + type : '');
        // Force reflow
        toast.offsetHeight;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    // ─── LocalStorage ───
    function saveMyWords() {
        localStorage.setItem('ingtr_mywords', JSON.stringify(myWords));
    }
    function loadMyWords() {
        try {
            const data = localStorage.getItem('ingtr_mywords');
            myWords = data ? JSON.parse(data) : [];
        } catch (e) {
            myWords = [];
        }
    }
    function saveGroups() {
        localStorage.setItem('ingtr_groups', JSON.stringify(groups));
    }
    function loadGroups() {
        try {
            const data = localStorage.getItem('ingtr_groups');
            groups = data ? JSON.parse(data) : [];
        } catch (e) {
            groups = [];
        }
    }

    // ─── Load Dictionary ───
    async function loadDictionary() {
        try {
            const resp = await fetch('./dictionary.json');
            dictionary = await resp.json();
        } catch (e) {
            console.error('Sözlük yüklenemedi:', e);
            dictionary = [];
        }
    }

    // ─── Tabs ───
    function switchTab(tab) {
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        tabContents.forEach(c => c.classList.toggle('active', c.id === 'content-' + tab));

        if (tab === 'mywords') renderMyWords();
        if (tab === 'quiz') updateQuizSetup();
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ═══════════════════════════════════════════════════════════
    //  TAB 1: DICTIONARY
    // ═══════════════════════════════════════════════════════════

    let dictDebounce = null;
    dictSearch.addEventListener('input', () => {
        clearTimeout(dictDebounce);
        dictDebounce = setTimeout(renderDictionary, 120);
        dictClear.style.display = dictSearch.value ? 'block' : 'none';
    });
    dictClear.addEventListener('click', () => {
        dictSearch.value = '';
        dictClear.style.display = 'none';
        renderDictionary();
        dictSearch.focus();
    });

    function renderDictionary() {
        const q = dictSearch.value.trim().toLowerCase();
        dictList.innerHTML = '';

        if (!q) {
            dictEmpty.style.display = 'block';
            dictCount.textContent = '';
            return;
        }

        const results = dictionary.filter(w =>
            w.en.toLowerCase().startsWith(q) ||
            w.en.toLowerCase().includes(q)
        ).sort((a, b) => {
            const aStarts = a.en.toLowerCase().startsWith(q);
            const bStarts = b.en.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.en.localeCompare(b.en);
        }).slice(0, 100); // limit for performance

        if (results.length === 0) {
            dictEmpty.style.display = 'block';
            dictEmpty.querySelector('p').textContent = 'Sonuç bulunamadı';
            dictCount.textContent = '';
            return;
        }

        dictEmpty.style.display = 'none';
        dictCount.textContent = results.length + (results.length >= 100 ? '+' : '') + ' sonuç';

        const fragment = document.createDocumentFragment();
        results.forEach(w => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.innerHTML = `
                <div class="word-text">
                    <span class="word-en">${esc(w.en)}</span>
                    <span class="word-tr">${esc(w.tr)}</span>
                </div>
                <div class="word-actions">
                    <button class="btn-add-to-list" title="Kelimelerime Ekle">+</button>
                </div>`;
            const addBtn = div.querySelector('.btn-add-to-list');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (addToMyWords(w.en, w.tr)) {
                    addBtn.textContent = '✓';
                    addBtn.style.pointerEvents = 'none';
                    addBtn.style.background = '#E8F5E9';
                    addBtn.style.color = '#4CAF50';
                }
            });
            fragment.appendChild(div);
        });
        dictList.appendChild(fragment);
    }

    function addToMyWords(en, tr) {
        const exists = myWords.some(w => w.en.toLowerCase() === en.toLowerCase());
        if (exists) {
            showToast('Bu kelime zaten listenizde!', 'error');
            return false;
        }
        const entry = { en, tr };
        if (activeGroup !== 'all') entry.group = activeGroup;
        myWords.push(entry);
        saveMyWords();
        showToast('✓ "' + en + '" kelimelerinize eklendi', 'success');
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    //  TAB 2: MY WORDS
    // ═══════════════════════════════════════════════════════════

    function renderGroupBar() {
        groupBar.innerHTML = '';

        // "Tümü" chip
        const allBtn = document.createElement('button');
        allBtn.className = 'group-chip' + (activeGroup === 'all' ? ' active' : '');
        allBtn.textContent = `Tümü (${myWords.length})`;
        allBtn.addEventListener('click', () => {
            activeGroup = 'all';
            renderMyWords();
        });
        groupBar.appendChild(allBtn);

        // User-created groups
        groups.forEach(grp => {
            const count = myWords.filter(w => w.group === grp).length;
            const chip = document.createElement('button');
            chip.className = 'group-chip' + (activeGroup === grp ? ' active' : '');
            chip.innerHTML = `<span>${esc(grp)} (${count})</span><span class="group-chip-del" title="Listeyi sil">×</span>`;
            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('group-chip-del')) {
                    e.stopPropagation();
                    deleteGroup(grp);
                    return;
                }
                activeGroup = grp;
                renderMyWords();
            });
            groupBar.appendChild(chip);
        });

        // "+ Yeni Liste" chip
        const addGrpBtn = document.createElement('button');
        addGrpBtn.className = 'group-chip group-chip-add';
        addGrpBtn.textContent = '+ Yeni Liste';
        addGrpBtn.addEventListener('click', () => {
            newGroupName.value = '';
            groupModal.style.display = 'flex';
            newGroupName.focus();
        });
        groupBar.appendChild(addGrpBtn);
    }

    function deleteGroup(grp) {
        groups = groups.filter(g => g !== grp);
        myWords.forEach(w => {
            if (w.group === grp) delete w.group;
        });
        if (activeGroup === grp) activeGroup = 'all';
        saveGroups();
        saveMyWords();
        renderMyWords();
        showToast('🗑️ "' + grp + '" listesi kaldırıldı (kelimeler Tümü altında korundu)');
    }

    btnGroupSave.addEventListener('click', createGroup);
    newGroupName.addEventListener('keydown', e => { if (e.key === 'Enter') createGroup(); });
    btnGroupCancel.addEventListener('click', () => groupModal.style.display = 'none');
    groupModal.addEventListener('click', e => { if (e.target === groupModal) groupModal.style.display = 'none'; });

    function createGroup() {
        const name = newGroupName.value.trim();
        if (!name) {
            showToast('Liste adı yazın', 'error');
            return;
        }
        if (groups.some(g => g.toLowerCase() === name.toLowerCase()) || name.toLowerCase() === 'tümü') {
            showToast('Bu isimde bir liste zaten var', 'error');
            return;
        }
        groups.push(name);
        saveGroups();
        activeGroup = name;
        groupModal.style.display = 'none';
        renderMyWords();
        showToast('✓ "' + name + '" listesi oluşturuldu', 'success');
    }

    btnAdd.addEventListener('click', addWord);
    addEn.addEventListener('keydown', e => { if (e.key === 'Enter') addTr.focus(); });
    addTr.addEventListener('keydown', e => { if (e.key === 'Enter') addWord(); });

    function addWord() {
        const en = addEn.value.trim();
        const tr = addTr.value.trim();
        if (!en || !tr) {
            showToast('Her iki alanı da doldurun', 'error');
            return;
        }
        const exists = myWords.some(w => w.en.toLowerCase() === en.toLowerCase());
        if (exists) {
            showToast('Bu kelime zaten listenizde!', 'error');
            return;
        }
        const entry = { en, tr };
        if (activeGroup !== 'all') entry.group = activeGroup;
        myWords.push(entry);
        saveMyWords();
        addEn.value = '';
        addTr.value = '';
        addEn.focus();
        renderMyWords();
        showToast('✓ Kelime eklendi', 'success');
    }

    mywordsSearch.addEventListener('input', renderMyWords);

    function renderMyWords() {
        renderGroupBar();
        const q = mywordsSearch.value.trim().toLowerCase();
        myWordsList.innerHTML = '';

        const groupFiltered = activeGroup === 'all'
            ? myWords
            : myWords.filter(w => w.group === activeGroup);

        const filtered = q
            ? groupFiltered.filter(w =>
                w.en.toLowerCase().includes(q) ||
                w.tr.toLowerCase().includes(q) ||
                (w.note && w.note.toLowerCase().includes(q))
            )
            : groupFiltered;

        if (filtered.length === 0) {
            mywordsEmpty.style.display = 'block';
            if (groupFiltered.length > 0 && q) {
                mywordsEmpty.querySelector('p').textContent = 'Aramanızla eşleşen kelime yok';
            } else if (activeGroup !== 'all') {
                mywordsEmpty.querySelector('p').textContent = `"${activeGroup}" listesinde henüz kelime yok`;
            } else {
                mywordsEmpty.querySelector('p').textContent = 'Henüz kelime eklemediniz';
            }
            mywordsCount.textContent = '';
            return;
        }

        mywordsEmpty.style.display = 'none';
        mywordsCount.textContent = filtered.length + ' kelime' + (q ? ' (filtrelendi)' : '');

        const fragment = document.createDocumentFragment();
        filtered.forEach((w) => {
            const realIndex = myWords.indexOf(w);
            const div = document.createElement('div');
            div.className = 'word-item has-note-panel';

            const noteBadge = w.note ? '<span class="word-note-badge" title="Açıklama mevcut">📝</span>' : '';
            const groupTag = (activeGroup === 'all' && w.group)
                ? `<span class="word-group-tag">${esc(w.group)}</span>`
                : '';

            div.innerHTML = `
                <div class="word-row" title="Açıklama eklemek için dokunun">
                    <div class="word-text">
                        <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
                            <span class="word-en">${esc(w.en)}${noteBadge}</span>
                            ${groupTag}
                        </div>
                        <span class="word-tr">${esc(w.tr)}</span>
                    </div>
                    <div class="word-actions">
                        <button class="btn-edit-word" title="Düzenle">✏️</button>
                        <button class="btn-delete-word" title="Sil">🗑️</button>
                    </div>
                </div>
                <div class="word-note-box" style="display:none;">
                    <textarea class="word-note-input" rows="2" placeholder="Açıklama veya örnek cümle yazın...">${esc(w.note || '')}</textarea>
                    <button class="btn-primary btn-note-save">Kaydet</button>
                </div>`;

            const wordRow = div.querySelector('.word-row');
            const noteBox = div.querySelector('.word-note-box');
            const noteInput = div.querySelector('.word-note-input');
            const noteSaveBtn = div.querySelector('.btn-note-save');

            wordRow.addEventListener('click', () => {
                const isOpen = noteBox.style.display !== 'none';
                noteBox.style.display = isOpen ? 'none' : 'flex';
                if (!isOpen) noteInput.focus();
            });

            noteSaveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = noteInput.value.trim();
                if (val) {
                    myWords[realIndex].note = val;
                } else {
                    delete myWords[realIndex].note;
                }
                saveMyWords();
                renderMyWords();
                showToast(val ? '✓ Açıklama kaydedildi' : 'Açıklama temizlendi', 'success');
            });

            div.querySelector('.btn-edit-word').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(realIndex);
            });
            div.querySelector('.btn-delete-word').addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteModal(realIndex);
            });
            fragment.appendChild(div);
        });
        myWordsList.appendChild(fragment);
    }

    // Edit Modal
    function openEditModal(index) {
        editingIndex = index;
        editEn.value = myWords[index].en;
        editTr.value = myWords[index].tr;
        editGroup.innerHTML = '<option value="">Grupsuz (Sadece Tümü)</option>' +
            groups.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
        editGroup.value = myWords[index].group || '';
        editModal.style.display = 'flex';
        editEn.focus();
    }
    btnEditSave.addEventListener('click', () => {
        const en = editEn.value.trim();
        const tr = editTr.value.trim();
        if (!en || !tr) {
            showToast('Her iki alanı da doldurun', 'error');
            return;
        }
        const updated = { ...myWords[editingIndex], en, tr };
        if (editGroup.value) {
            updated.group = editGroup.value;
        } else {
            delete updated.group;
        }
        myWords[editingIndex] = updated;
        saveMyWords();
        editModal.style.display = 'none';
        renderMyWords();
        showToast('✓ Kelime güncellendi', 'success');
    });
    btnEditCancel.addEventListener('click', () => editModal.style.display = 'none');
    editModal.addEventListener('click', e => { if (e.target === editModal) editModal.style.display = 'none'; });

    // Delete Modal
    function openDeleteModal(index) {
        deletingIndex = index;
        deleteMsg.textContent = `"${myWords[index].en}" kelimesini silmek istediğinize emin misiniz?`;
        deleteModal.style.display = 'flex';
    }
    btnDeleteConfirm.addEventListener('click', () => {
        const word = myWords[deletingIndex].en;
        myWords.splice(deletingIndex, 1);
        saveMyWords();
        deleteModal.style.display = 'none';
        renderMyWords();
        showToast('🗑️ "' + word + '" silindi');
    });
    btnDeleteCancel.addEventListener('click', () => deleteModal.style.display = 'none');
    deleteModal.addEventListener('click', e => { if (e.target === deleteModal) deleteModal.style.display = 'none'; });

    // Export JSON
    btnExportJson.addEventListener('click', () => {
        if (myWords.length === 0) {
            showToast('Dışa aktarılacak kelime yok', 'error');
            return;
        }
        downloadFile('kelimelerim.json', JSON.stringify(myWords, null, 2), 'application/json');
        showToast('📥 JSON olarak indirildi', 'success');
    });

    // Export TXT
    btnExportTxt.addEventListener('click', () => {
        if (myWords.length === 0) {
            showToast('Dışa aktarılacak kelime yok', 'error');
            return;
        }
        const txt = myWords.map(w => w.en + '\t' + w.tr).join('\n');
        downloadFile('kelimelerim.txt', txt, 'text/plain');
        showToast('📥 TXT olarak indirildi', 'success');
    });

    // Import
    btnImport.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                let imported;
                const text = ev.target.result;
                if (file.name.endsWith('.json')) {
                    imported = JSON.parse(text);
                    if (!Array.isArray(imported)) throw new Error('Geçersiz format');
                    imported = imported.filter(w => w.en && w.tr);
                } else {
                    // TXT: tab-separated
                    imported = text.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.includes('\t'))
                        .map(line => {
                            const parts = line.split('\t');
                            return { en: parts[0].trim(), tr: parts.slice(1).join(', ').trim() };
                        })
                        .filter(w => w.en && w.tr);
                }
                if (imported.length === 0) {
                    showToast('Geçerli kelime bulunamadı', 'error');
                    return;
                }
                let added = 0;
                imported.forEach(w => {
                    const exists = myWords.some(m => m.en.toLowerCase() === w.en.toLowerCase());
                    if (!exists) {
                        const entry = { en: w.en, tr: w.tr };
                        if (w.group) {
                            entry.group = w.group;
                            if (!groups.includes(w.group)) groups.push(w.group);
                        }
                        if (w.note) entry.note = w.note;
                        myWords.push(entry);
                        added++;
                    }
                });
                saveGroups();
                saveMyWords();
                renderMyWords();
                showToast(`✓ ${added} kelime içe aktarıldı (${imported.length - added} zaten mevcut)`, 'success');
            } catch (err) {
                showToast('Dosya okunamadı: ' + err.message, 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');
        importFile.value = '';
    });

    function downloadFile(filename, content, mime) {
        const blob = new Blob([content], { type: mime + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ═══════════════════════════════════════════════════════════
    //  TAB 3: QUIZ
    // ═══════════════════════════════════════════════════════════

    function getQuizPool() {
        const grp = quizGroupSelect.value;
        return grp === 'all' ? myWords : myWords.filter(w => w.group === grp);
    }

    function refreshQuizAvailability() {
        const pool = getQuizPool();
        const count = pool.length;
        const label = quizGroupSelect.value === 'all' ? 'Tüm kelimelerinizde' : `"${quizGroupSelect.value}" listesinde`;
        quizWordCount.textContent = `${label} ${count} kelime var.`;

        const hasEnoughTotal = myWords.length >= 4 && count > 0;
        btnMC.disabled = !hasEnoughTotal;
        btnWrite.disabled = count === 0;

        if (myWords.length < 4 && count > 0) {
            quizWordCount.textContent += ' (Çoktan seçmeli için en az 4 kelime gerekli)';
        }
        if (count === 0) {
            quizWordCount.textContent = 'Test yapabilmek için bu listeye kelime ekleyin.';
        }
    }

    function updateQuizSetup() {
        quizSetup.style.display = 'block';
        quizArea.style.display = 'none';
        quizResults.style.display = 'none';

        const prev = quizGroupSelect.value;
        quizGroupSelect.innerHTML = `<option value="all">Tüm Kelimeler (${myWords.length})</option>` +
            groups.map(g => {
                const c = myWords.filter(w => w.group === g).length;
                return `<option value="${esc(g)}">${esc(g)} (${c})</option>`;
            }).join('');
        if ([...quizGroupSelect.options].some(o => o.value === prev)) {
            quizGroupSelect.value = prev;
        }
        refreshQuizAvailability();
    }

    quizGroupSelect.addEventListener('change', refreshQuizAvailability);

    // Question count selection
    qCountOptions.addEventListener('click', e => {
        const btn = e.target.closest('.q-count-btn');
        if (!btn) return;
        qCountOptions.querySelectorAll('.q-count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });

    function getSelectedCount() {
        const pool = getQuizPool();
        const active = qCountOptions.querySelector('.q-count-btn.active');
        const val = active ? active.dataset.count : '5';
        return val === 'all' ? pool.length : Math.min(parseInt(val), pool.length);
    }

    // Start quiz
    btnMC.addEventListener('click', () => startQuiz('mc'));
    btnWrite.addEventListener('click', () => startQuiz('write'));

    function startQuiz(mode) {
        const pool = getQuizPool();
        const count = getSelectedCount();
        if (count === 0) return;

        // Shuffle and pick
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const questions = shuffled.slice(0, count);

        quizState = {
            mode,
            questions,
            current: 0,
            correct: 0,
            wrong: 0,
            wrongList: [],
            answered: false
        };

        quizSetup.style.display = 'none';
        quizResults.style.display = 'none';
        quizArea.style.display = 'block';

        showQuestion();
    }

    function showQuestion() {
        const q = quizState.questions[quizState.current];
        const total = quizState.questions.length;
        const num = quizState.current + 1;

        quizState.answered = false;

        // Update header
        quizProgress.textContent = `${num} / ${total}`;
        quizScoreLive.innerHTML = `✅ ${quizState.correct} &nbsp; ❌ ${quizState.wrong}`;
        quizProgressFill.style.width = ((num - 1) / total * 100) + '%';
        quizWord.textContent = q.en;

        // Clear
        quizFeedback.textContent = '';
        quizFeedback.className = 'quiz-feedback';
        btnNext.style.display = 'none';

        if (quizState.mode === 'mc') {
            quizInstruction.textContent = 'Doğru Türkçe karşılığı seçin';
            quizOptions.style.display = 'flex';
            quizInputArea.style.display = 'none';
            renderMCOptions(q);
        } else {
            quizInstruction.textContent = 'Türkçe anlamını yazın';
            quizOptions.style.display = 'none';
            quizInputArea.style.display = 'flex';
            quizAnswer.value = '';
            quizAnswer.disabled = false;
            quizAnswer.focus();
        }
    }

    function renderMCOptions(question) {
        // Get 3 wrong options from myWords (excluding the correct one)
        const otherWords = myWords.filter(w => w.en.toLowerCase() !== question.en.toLowerCase());
        const shuffledOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [
            { text: question.tr, correct: true },
            ...shuffledOthers.map(w => ({ text: w.tr, correct: false }))
        ].sort(() => Math.random() - 0.5);

        quizOptions.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = opt.text;
            btn.addEventListener('click', () => handleMCAnswer(btn, opt, question));
            quizOptions.appendChild(btn);
        });
    }

    function handleMCAnswer(btn, opt, question) {
        if (quizState.answered) return;
        quizState.answered = true;

        // Disable all options
        quizOptions.querySelectorAll('.quiz-option').forEach(b => b.classList.add('disabled'));

        if (opt.correct) {
            btn.classList.add('correct');
            quizState.correct++;
            quizFeedback.textContent = '✅ Doğru!';
            quizFeedback.className = 'quiz-feedback correct';
        } else {
            btn.classList.add('wrong');
            // Highlight correct answer
            quizOptions.querySelectorAll('.quiz-option').forEach(b => {
                if (b.textContent === question.tr) b.classList.add('correct');
            });
            quizState.wrong++;
            quizState.wrongList.push({
                en: question.en,
                yourAnswer: opt.text,
                correctAnswer: question.tr
            });
            quizFeedback.textContent = `❌ Yanlış! Doğrusu: ${question.tr}`;
            quizFeedback.className = 'quiz-feedback wrong';
        }

        quizScoreLive.innerHTML = `✅ ${quizState.correct} &nbsp; ❌ ${quizState.wrong}`;

        // Auto-advance after delay
        setTimeout(nextQuestion, 1200);
    }

    // Written answer
    btnCheck.addEventListener('click', checkWrittenAnswer);
    quizAnswer.addEventListener('keydown', e => {
        if (e.key === 'Enter') checkWrittenAnswer();
    });

    function checkWrittenAnswer() {
        if (quizState.answered) return;
        const answer = quizAnswer.value.trim();
        if (!answer) {
            showToast('Bir cevap yazın', 'error');
            return;
        }

        quizState.answered = true;
        quizAnswer.disabled = true;

        const question = quizState.questions[quizState.current];

        // Check answer: case-insensitive, support comma-separated meanings
        const correctAnswers = question.tr
            .split(',')
            .map(a => a.trim().toLowerCase())
            .filter(a => a.length > 0);

        const userAnswer = answer.toLowerCase().trim();
        const isCorrect = correctAnswers.some(ca => ca === userAnswer);

        if (isCorrect) {
            quizState.correct++;
            quizFeedback.textContent = '✅ Doğru!';
            quizFeedback.className = 'quiz-feedback correct';
        } else {
            quizState.wrong++;
            quizState.wrongList.push({
                en: question.en,
                yourAnswer: answer,
                correctAnswer: question.tr
            });
            quizFeedback.textContent = `❌ Yanlış! Doğrusu: ${question.tr}`;
            quizFeedback.className = 'quiz-feedback wrong';
        }

        quizScoreLive.innerHTML = `✅ ${quizState.correct} &nbsp; ❌ ${quizState.wrong}`;
        btnNext.style.display = 'block';
        btnNext.focus();
    }

    btnNext.addEventListener('click', nextQuestion);

    function nextQuestion() {
        quizState.current++;
        if (quizState.current >= quizState.questions.length) {
            showResults();
        } else {
            showQuestion();
        }
    }

    function showResults() {
        quizArea.style.display = 'none';
        quizResults.style.display = 'block';

        const total = quizState.questions.length;
        const pct = total > 0 ? Math.round(quizState.correct / total * 100) : 0;

        resultScore.innerHTML = `
            <div class="score-box correct-box">
                <span class="score-number">${quizState.correct}</span>
                <span class="score-label">Doğru</span>
            </div>
            <div class="score-box wrong-box">
                <span class="score-number">${quizState.wrong}</span>
                <span class="score-label">Yanlış</span>
            </div>`;

        if (quizState.wrongList.length > 0) {
            resultWrongSection.style.display = 'block';
            resultWrongList.innerHTML = quizState.wrongList.map(w => `
                <div class="wrong-item">
                    <div class="wrong-word">${esc(w.en)}</div>
                    <div class="wrong-your-answer">Sizin cevabınız: ${esc(w.yourAnswer)}</div>
                    <div class="wrong-correct">Doğru cevap: ${esc(w.correctAnswer)}</div>
                </div>
            `).join('');
        } else {
            resultWrongSection.style.display = 'none';
        }
    }

    btnRestart.addEventListener('click', () => {
        quizState = null;
        updateQuizSetup();
    });

    // ─── Utility ───
    function esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Theme & Color Palette ───
    const btnTheme = $('btn-theme');
    const btnPalette = $('btn-palette');
    const paletteModal = $('palette-modal');
    const btnPaletteClose = $('btn-palette-close');
    const btnPaletteReset = $('btn-palette-reset');
    const swatchesEn = $('swatches-en');
    const swatchesTr = $('swatches-tr');
    const customColorEn = $('custom-color-en');
    const customColorTr = $('custom-color-tr');

    function applyWordColors() {
        const enColor = localStorage.getItem('ingtr_word_en_color');
        const trColor = localStorage.getItem('ingtr_word_tr_color');

        if (enColor) {
            document.body.style.setProperty('--word-en-color', enColor);
            customColorEn.value = enColor;
        } else {
            document.body.style.removeProperty('--word-en-color');
        }

        if (trColor) {
            document.body.style.setProperty('--word-tr-color', trColor);
            customColorTr.value = trColor;
        } else {
            document.body.style.removeProperty('--word-tr-color');
        }

        updateActiveSwatches(swatchesEn, enColor);
        updateActiveSwatches(swatchesTr, trColor);
    }

    function updateActiveSwatches(container, activeColor) {
        container.querySelectorAll('.color-swatch').forEach(btn => {
            const match = activeColor && btn.dataset.color.toLowerCase() === activeColor.toLowerCase();
            btn.classList.toggle('active', !!match);
        });
    }

    function setTheme(dark) {
        document.body.classList.toggle('dark-theme', dark);
        btnTheme.textContent = dark ? '☀️' : '🌙';
        localStorage.setItem('ingtr_theme', dark ? 'dark' : 'light');
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.content = dark ? '#0F172A' : '#4A90D9';
        applyWordColors();
    }

    function loadTheme() {
        const saved = localStorage.getItem('ingtr_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(saved === 'dark' || (!saved && prefersDark));
    }

    btnTheme.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        setTheme(!isDark);
    });

    btnPalette.addEventListener('click', () => {
        applyWordColors();
        paletteModal.style.display = 'flex';
    });
    btnPaletteClose.addEventListener('click', () => paletteModal.style.display = 'none');
    paletteModal.addEventListener('click', e => {
        if (e.target === paletteModal) paletteModal.style.display = 'none';
    });

    swatchesEn.addEventListener('click', e => {
        const btn = e.target.closest('.color-swatch');
        if (!btn) return;
        localStorage.setItem('ingtr_word_en_color', btn.dataset.color);
        applyWordColors();
    });
    swatchesTr.addEventListener('click', e => {
        const btn = e.target.closest('.color-swatch');
        if (!btn) return;
        localStorage.setItem('ingtr_word_tr_color', btn.dataset.color);
        applyWordColors();
    });
    customColorEn.addEventListener('input', e => {
        localStorage.setItem('ingtr_word_en_color', e.target.value);
        applyWordColors();
    });
    customColorTr.addEventListener('input', e => {
        localStorage.setItem('ingtr_word_tr_color', e.target.value);
        applyWordColors();
    });
    btnPaletteReset.addEventListener('click', () => {
        localStorage.removeItem('ingtr_word_en_color');
        localStorage.removeItem('ingtr_word_tr_color');
        applyWordColors();
        showToast('✓ Varsayılan renklere dönüldü', 'success');
    });

    // ─── Service Worker Registration ───
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW registration failed:', err));
        });
    }

    // ─── Init ───
    async function init() {
        loadTheme();
        loadGroups();
        loadMyWords();
        await loadDictionary();
        renderDictionary();
        renderMyWords();
    }

    init();
})();
