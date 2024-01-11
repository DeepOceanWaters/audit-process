/**
 * TODO:
 *      - Remove process.
 *      - Remove all processes.
 *      - allow users to remove completed processes
 *      - show process completion amount.
 *      - "return to previous spot" button (takes you to the last process you were on)
 *      
 */

/* micro library */
const make = (type) => document.createElement(type)

const str2bool = (str) => str.toLowerCase() === 'true'

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj))

const nextChar = (c) => {
    var i = (parseInt(c, 36) + 1 ) % 36;
    return (!i * 10 + i).toString(36);
}

const uuid = {
    _usedIds: {},
    _modifier: 'a',
    _curCount: 0,
    next: function () {
        let id = this._next();
        while(this._usedIds.hasOwnProperty(id)) id = this._next();
        this._usedIds[id] = true;
        return id;
    },

    _next: function () {
        if (++this._curCount > 100000) {
            this._modifier = nextChar(this._modifier)
            this._curCount = 0;
        }
        return `${this._modifier}${++this._curCount}`;
    },

    add: function (id) {
        if (this._usedIds.hasOwnProperty(id)) return;
        this._usedIds[id] = true;
    }
}

const processParents = {}
/* end micro library */

class StoredObject {
    obj;
    name;
    boxes;
    updateCallbacks;

    constructor(name, obj) {
        this.name = name;
        this.obj = obj;
        this.boxes = {};
        this.updateCallbacks = [];
        
        this.updateAllCheckboxes();

        if(!StoredObject.storageAvailable()) console.warn("Local storage is not available, could not modify");
    }

    updateAllCheckboxes() {
        for(const process in this.obj.pages) {
            this.updateCheckboxesMap(this.obj.pages[process]);
        }
    }

    updateCheckboxesMap(process = this.obj) {
        // if object doesn't already have an id, then it should be
        if(!process.id) process.id = uuid.next();
        uuid.add(process.id);
        if(!this.boxes.hasOwnProperty(process.id)) this.boxes[process.id] = process;
        // if there are no more sub processes then return
        if(!process.hasOwnProperty('subProcesses')) return;
        // add subprocesses to boxes
        if(process.hasOwnProperty('subProcesses')) {
            for(const subProcess of process.subProcesses) {
                this.updateCheckboxesMap(subProcess);
            }
        }
    }

    addEventHandler(type = 'update', callback) {
        if (type === 'update') this.updateCallbacks.push(callback);
    }

    /* taken from MDN */
    /**
     * Check if local storage is available.
     * @param {String} type 
     * @returns 
     */
    static storageAvailable(type = 'localStorage') {
        let storage;
        try {
            storage = window[type];
            const x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
            return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                (storage && storage.length !== 0);
        }
    }

    /**
     * Creates a local storage item from [obj]
     * @param {Object} obj object to create the local storage item from
     * @param {String} name name of the local storage item
     * @returns 
     */
    static fromObject(obj, name = uuid.next()) {
        return new StoredObject(name, obj);
    }

    /**
     * Gets the local storage item identified by [name]. If an item is not found, creates a new
     * local storage item with that [name], and initializes it with [defaultObject].
     * @param {String} name name of the localStorage item
     * @param {Object} defaultObj if local storage item with name is not found, init that item with this object
     * @returns 
     */
    static fromLocalStorage(name, defaultObj = {}) {
        if (!this.storageAvailable()) throw new Error("Local storage is not available, could not cannot create StoredObject");
        let objStr = localStorage.getItem(name);
        if (!objStr) {
            console.warn(`no object found with name: ${name}; creating a new one.`);
            localStorage.setItem(name, JSON.stringify(defaultObj));
            objStr = localStorage.getItem(name);
        }
        let obj = JSON.parse(objStr);
        return new StoredObject(name, obj);
    }

    /**
     * Takes executes a function that modifies an object taken as a parameter.
     * @param {Function} callback modifies the object, takes an object as a parameter.
     */
    modify(callback, update = true) {
        callback(this.obj);
        if(update) this.updateAllCheckboxes();
        if(StoredObject.storageAvailable()) localStorage.setItem(this.name, JSON.stringify(this.obj));
        for(const callback of this.updateCallbacks) {
            callback();
        }
        return;
    }
}

/* START CONFIG */
/* Checked:
       -1 - intederminate
        0 - not checked
        1 - checked 
*/
/**
 * Process object definition:
 * Process
 * {
 *      name: string,
 *      checked: [-1, 0, 1],
 *      id: string,
 *      subProcesses: Array<Process>
 * }
 */
const pageProcesses = {
    name: 'Audit Process',
    checked: 0,
    subProcesses: [
        { 
            name: 'Run Automated Scan',
            checked: 0,
            subProcesses: [
                { name: 'Axe Dev' },
                { name: 'Page Title' },
                { name: 'Page Language' } 
            ]
        },
        { 
            name: 'Color Contrast Check', 
            checked: 0,
            subProcesses: [
                { name: 'Text' },
                { name: 'Non-text' },
                { name: 'Focus Indicator' }
            ]
        },
        { name: 'Tab Navigation (no AT)', checked: 0 },
        { name: 'Tab Navigation (AT)', checked: 0 },
        { name: 'Arrow Navigation (SR)', checked: 0 },
        { 
            name: 'Forms',
            checked: 0,
            subProcesses: [
                { name: 'Complete with Errors' },
                { name: 'Complete with no Errors' },
                { name: 'Preventions' }
            ]
        },
        { name: 'Text Spacing', checked: 0 },
        { name: 'Zoom 200%', checked: 0 },
        { name: 'Viewport 320x256', checked: 0 }
    ]
}


/* END CONFIG */

/**
 * TODO:
 *      use localstorage to save progress
 *      make these accordion
 * pages {
 *      page
 *  }
 */

const localStorageName = 'auditProcess';
const curProcessName = 'currentAuditProcess';
const progressBarId = 'progress-bar';

let localStorageObject;
if (StoredObject.storageAvailable()) {
    localStorageObject = StoredObject.fromLocalStorage(localStorageName, { pages: {} });   
}
if (localStorageObject.obj.hasOwnProperty('pages')) {
    let processes = addProcessToPage(Object.keys(localStorageObject.obj.pages));
    let processesContainer = document.querySelector('[data-processes-container]');
    processesContainer.append(...processes);
}


const settings = document.querySelector('[data-settings]')
const settingsForm = make('form');
const [label, textIn, addBtn] = makeSettingsParts();
addBtn.classList.add('center-stage');
settingsForm.addEventListener('submit', (e) => { addBtn.click(); e.preventDefault(); })
settingsForm.append(label, textIn, addBtn)
settings.appendChild(settingsForm)

const skipBtn = make('button');

skipBtn.appendChild(make('div'));
skipBtn.children[0].classList.add('btn', 'link', 'warning');
skipBtn.children[0].textContent = 'skip to current process';
skipBtn.addEventListener('click', (e) => {
    let curProcess = document.querySelector('[data-process-widget] button.warning');
    if (!curProcess) {
        curProcess = document.querySelector('[data-process-widget] button:not(.warning):not(.positive)');
    }
    if (!curProcess) {
        alert('Cannot skip as all processes are complete!');
        return;
    }
    curProcess.focus();
    curProcess.scrollIntoView();
});
settings.appendChild(skipBtn);
makeAsideProgress();


// add aside content
function updateProgress() {
    let processStatus = document.getElementById('processes-status');
    let progressBar = document.getElementById(progressBarId);
    let processKeys = Object.keys(localStorageObject.obj.pages);
    processStatus.textContent = `${processKeys.length - progressBar.value} processes left!`;
}

function makeAsideProgress() {
    const progressHeadingId = 'progress-heading';
    let progressBar = document.getElementById(progressBarId);
    let processOverview = document.querySelector('[data-processes-overview]');

    let processKeys = Object.keys(localStorageObject.obj.pages);
    // setup progressBar
    progressBar.setAttribute('aria-labelledby', progressHeadingId);
    progressBar.max = processKeys.length;
    progressBar.value = 0;
    
    // 
    for(const key of processKeys) {
        let process = localStorageObject.obj.pages[key];
        if (process.checked === 1) progressBar.value = progressBar.value +  1;
        let processItem = make('li');/*
        let processState = make('span');
        let link = make('a');
        let btnId = document.querySelector(`[data-process-widget]:has(#${process.id}) > button`).id;
        // set up process state

        processState.id = uuid.next();
        processState.classList.add('btn-state');*/
        switch(process.checked) {
            case -1:
                //processState.textContent = 'started';
                //processState.classList.add('started');
                //link.classList.add('warning');
                processItem.classList.add('warning');
                break;
            case 1:
                //processState.textContent = 'finished';
                //processState.classList.add('finished');
                //link.classList.add('positive');
                processItem.classList.add('positive');
                break;
            default:
                processItem.classList.add('default');
                break;
        }
        // set up link
        /*link.href = `#${btnId}`;
        link.text = key;
        link.classList.add('btn', 'link');
        link.setAttribute('aria-describedby', processState.id);*/
        // add list item to process overview
        //processItem.append(link, processState);
        
        processOverview.appendChild(processItem);
        updateProgress();
    }
}




function makeSettingsParts() {
    const textIn = make('textarea')
    textIn.id = uuid.next()
    
    const label = make('label')
    label.htmlFor = textIn.id
    label.textContent = 'Pages to process (comma separated)'

    const addBtn = make('button')
    addBtn.appendChild(make('div'));
    addBtn.children[0].textContent = 'add processes'
    addBtn.type = 'button'
    addBtn.children[0].classList.add('btn', 'secondary')
    addBtn.addEventListener('click', (e) => {
        const pages = textIn.value.replaceAll(/[,;\n]+/g, ';').split(';').map(t => t.trim())
        addProcessToPage(pages);
        textIn.value = ''
        alert(`added ${pages.length} processes successfully!`)
    })

    return [label, textIn, addBtn]
}

function addProcessToPage(pages) {
    let html = [];
    for (const page of pages) {
        let pageProcess; 
        if (localStorageObject.obj.pages.hasOwnProperty(page)) {
            // use existing process
            pageProcess = localStorageObject.obj.pages[page]
        }
        else {
            // create a new process
            localStorageObject.modify((obj) => {
                obj.pages[page] = deepCopy(pageProcesses);
            });
            pageProcess = localStorageObject.obj.pages;
        }
        
        let processWrapper = document.createElement('div');
        processWrapper.id = uuid.next()
        processWrapper.append(...process2html(localStorageObject, pageProcess, 1));
    
        processWrapper.hidden = true;

        const toggleBtn = (btn) => {
            const expanded = !str2bool(btn.getAttribute('aria-expanded'));
            btn.setAttribute('aria-expanded', expanded);
            document.getElementById(btn.getAttribute('aria-controls')).hidden = !expanded;
        }
    
        let toggleVisBtn = make('button');
        toggleVisBtn.appendChild(make('div'));
        toggleVisBtn.children[0].classList.add('btn', 'secondary', 'expanded');
        toggleVisBtn.id = uuid.next();
        toggleVisBtn.children[0].textContent = page;
        let topLevelCheckbox = processWrapper.querySelector('input[type="checkbox"]')
        setBtnState(toggleVisBtn.children[0], topLevelCheckbox);
        
        toggleVisBtn.dataset.accordionBtn = '';
        toggleVisBtn.setAttribute('aria-expanded', false);
        
        toggleVisBtn.setAttribute('aria-controls', processWrapper.id);
        toggleVisBtn.addEventListener('click', (e) => {
            toggleBtn(toggleVisBtn);
            let parent = toggleVisBtn.parentElement;
            while(!('processWidget' in parent.dataset) && parent !== document.body) parent = parent.parentElement;
            if (parent === document.body) throw new Error('no proper parent found D:');
            let processesContainer = parent.parentElement;
            let allToggleVisBtns = processesContainer.querySelectorAll('button[data-accordion-btn][aria-expanded="true"]');
            for (const btn of allToggleVisBtns) {
                if (btn === toggleVisBtn) continue;
                toggleBtn(btn);
            }
            toggleVisBtn.scrollIntoView();
        });

        topLevelCheckbox.addEventListener('change', (e) => {
            setBtnState(toggleVisBtn.children[0], topLevelCheckbox);
        });
    
        let wrapper = make('div')
        wrapper.classList.add('process-wrapper');
        wrapper.dataset.processWidget = '';
        wrapper.append(toggleVisBtn, processWrapper);
        html.push(wrapper);
    }
    return html;
}

function setBtnState(btn, processCheckbox) {
    let stateSpan = btn.querySelector('span.btn-state');
    if (stateSpan) {
        stateSpan.textContent = "";
    }
    else {
        stateSpan = make('span');
    }
    btn.classList.remove('positive', 'warning');
    if (processCheckbox.checked) {
        btn.classList.add('positive');
        stateSpan.textContent = 'finished';
        stateSpan.classList.add('btn-state', 'finished');
        btn.appendChild(stateSpan);
    }
    else if (processCheckbox.indeterminate) {
        btn.classList.add('warning');
        stateSpan.textContent = 'started';
        stateSpan.classList.add('btn-state', 'started');
        btn.appendChild(stateSpan);
    }
}


/**
 * Takes in a process object.
 * @param {Object<Process>} process
 */
function process2html(storageObject, process, headingLvl) {
    let html = [];
    let [checkbox, label] = makeChekcboxParts(process);
    label.prepend(checkbox);
    label.classList.add('chkbox-pair');
    //process.checkbox = checkbox

    checkbox.addEventListener('change', (e) => {
        storageObject.modify(() => updateProcess(e, process));
    });

    checkbox.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') e.currentTarget.click();
    });

    if (process.subProcesses) {
        let list = document.createElement('ul');
        process.subProcesses.forEach(p => {
            processParents[p.id] = process;
            //p.parentProcess = process;
            let li = document.createElement('li');
            let [sublabel, sublist] = process2html(storageObject, p, headingLvl + 1);
            li.append(sublabel);
            if (sublist) li.append(sublist)
            list.appendChild(li);
        });

        html.push(label);
        html.push(list);
    }
    else {
        html.push(label);
    }
    return html;
}

function getAssociatedExpansionBtn(element) {
    let parent = element.parentElement;
    do {
        continue;
    } while((parent = parent.parentElement) && !parent.classList.contains('process-wrapper') && parent !== window.body)
    if (parent) {
        return parent.querySelector('[data-accordion-btn]');
    }
    else {
        throw new Error('what??? buh how?');
    }
}

/**
 * when:
 *      process has subprocess and is checked:
 *          check all subprocesses, and that subprocess should check all, so on and so on.
 *      process is checked and has parent process:
 *          updated parent process
 * 
 * we should:
 *      1. process subitems
 *      2. process parent items
 * @param {*} e 
 * @param {*} process 
 */
function updateProcess(e, process) {
    if (process.subProcesses) {
        updateSubprocesses(e, process)
    }
    if (processParents.hasOwnProperty(process.id)) {
        updateParentprocess(e, processParents[process.id]);
    }
    let checkbox = document.getElementById(process.id);
    process.checked = checkbox.checked ? 1 : 0;
    let accordionBtn = getAssociatedExpansionBtn(e.currentTarget);
    setBtnState(accordionBtn.children[0], accordionBtn.parentElement.querySelector('input[type="checkbox"]'));
}

function updateSubprocesses(e, process) {
    process.subProcesses.forEach(p => {
        let parentProcessCheckbox = document.getElementById(process.id);
        let childProcessCheckbox = document.getElementById(p.id);
        if(!parentProcessCheckbox) throw new Error(`couldn't find checkbox with id of: ${process.id}`);
        if(!childProcessCheckbox) throw new Error(`couldn't find checkbox with id of: ${p.id}`);
        childProcessCheckbox.checked = parentProcessCheckbox.checked;
        childProcessCheckbox.indeterminate = false;   
        p.checked = childProcessCheckbox.checked ? 1 : 0;
    })
    // array of only subprocess that also have subprocesses
    // then we call this function again to update the descendants of this process
    process.subProcesses.filter(p => p.hasOwnProperty('subProcesses')).forEach(p => updateSubprocesses(e, p))
}

function updateParentprocess(e, process) {
    if(!process.subProcesses) {
        throw new Error('how is this possible!??!?')
    }
    let checkbox = document.getElementById(process.id);
    // if all subprocesses are checked then check this process
    if (process.subProcesses.every(p => document.getElementById(p.id).checked)) {
        checkbox.indeterminate = false
        checkbox.checked = true
        process.checked = 1;
    } // if at least one subprocesses is checked or partially checked
    else if (process.subProcesses.some(p => document.getElementById(p.id).checked || document.getElementById(p.id).indeterminate)) {
        checkbox.indeterminate = true
        checkbox.checked = false
        process.checked = -1;
    } // no checkboxes are checked, or intermediate
    else {
        checkbox.indeterminate = false
        checkbox.checked = false
        process.checked = 0;
    }
    if (processParents[process.id]) {
        updateParentprocess(e, processParents[process.id]);
    }
}
/*
function makeCheckboxPair(text, id) {
    let [checkbox, label] = makeChekcboxParts(text, id);

    let container = document.createElement('div');
    container.append(checkbox, label);
    container.classList.add('chkbox-pair');

    return [container];
}*/



function makeChekcboxParts(process) {
    let chkbox = document.createElement('input');
    chkbox.type = 'checkbox';
    chkbox.id = process.id;
    switch(process.checked) {
        case 1:
            chkbox.checked = true;
            break;
        case 0:
            chkbox.checked = false;
            break;
        case -1:
            chkbox.indeterminate = true;
            break;
        default:
            break;
    }

    let label = document.createElement('label');
    label.htmlFor = chkbox.id;
    label.textContent = process.name;

    return [chkbox, label];
}

