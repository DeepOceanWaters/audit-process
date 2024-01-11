let fileInputContainers = document.querySelectorAll('[data-file-input]');
fileInputContainers.forEach(fileInputContainer => initFileInput(fileInputContainer));

function initFileInput(fileInputContainer) {
    let fileNamesList = fileInputContainer.querySelector('[data-file-names]');
    let fileInput = fileInputContainer.querySelector('input[type="file"]');

    fileInput.addEventListener('change', (e) => {
        fileNamesList.innerHTML = '';
        [...fileInput.files].forEach(file => {
            let li = document.createElement('li');
            li.textContent = file.name;
            fileNamesList.appendChild(li);
        });
    });
}