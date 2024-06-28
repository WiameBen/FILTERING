let map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
}).addTo(map);

let filteredData = data;

const indexRange = {
    'FD_3': [0, 175],'ID_3': [0, 62],'SU_3': [0, 250],'DTmax35_3': [0, 156],'TR_3': [0, 149],'R5mm_3': [0, 176],'R10mm_3': [0, 113],'SDII_3': [0, 60],'Rx5day_3': [0, 107],'PRECtot_3': [0, 2151],'DTR_3': [0, 20],'CDD_3': [0, 361],
    'CWD_3': [0, 272],'FD_4': [0, 230],'ID_4': [0, 195],'SU_4': [0, 12],'DTmax35_4': [0, 6],'TR_4': [0, 10],'R5mm_4': [0, 27],'R10mm_4': [0, 19],'SDII_4': [0, 21],'Rx5day_4': [0, 125],'PRECtot_4': [0, 723],'DTR_4': [0, 20],'CDD_4': [0, 93],
    'CWD_4': [0, 211],'FD_5': [0, 276],'ID_5': [0, 219],'SU_5': [0, 24],'DTmax35_5': [0, 15],'TR_5': [0, 15],'R5mm_5': [0, 127],'R10mm_5': [0, 54],'SDII_5': [0, 22],'Rx5day_5': [0, 125],'PRECtot_5': [0, 1680],
    'DTR_5': [0, 12],'CDD_5': [0, 105],'CWD_5': [0, 296],'FD_2': [0, 217],'ID_2': [0, 181],'SU_2': [0, 8],'DTmax35_2': [0, 6],'TR_2': [0, 5],'R5mm_2': [0, 72],'R10mm_2': [0, 11],'SDII_2': [0, 24],'Rx5day_2': [0, 118],
    'PRECtot_2': [0, 905],'DTR_2': [0, 19],'CDD_2': [0, 19],'CWD_2': [0, 182],'FD_1': [0, 278],'ID_1': [0, 155],'SU_1': [0, 108],'DTmax35_1': [0, 44],'TR_1': [0, 69],'R5mm_1': [0, 170],'R10mm_1': [0, 112],
    'SDII_1': [0, 38],'Rx5day_1': [0, 112],'PRECtot_1': [0, 2330],'DTR_1': [0, 17],'CDD_1': [0, 123],'CWD_1': [0, 281]
};

function filterData() {
    let criteriaGroups = document.querySelectorAll('.criteria-group');
    filteredData = data;
    let validFilter = true;

    criteriaGroups.forEach(group => {
        let period = group.querySelector('.period').value;
        let index = group.querySelector('.index').value;
        let rangeSlider = group.querySelector('.range-slider').noUiSlider;
        let values = rangeSlider.get();
        let minValue = parseFloat(values[0]);
        let maxValue = parseFloat(values[1]);

        filteredData = filteredData.filter(row => {
            return row[index] >= minValue && row[index] <= maxValue;
        });
    });

    if (validFilter) {
        updateMap(filteredData);
    }
}

function updateMap(data) {
    map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });

    if (data.length > 0) {
        let latSum = 0;
        let lonSum = 0;

        data.forEach(row => {
            latSum += row['Latitude'];
            lonSum += row['Longitude'];

            L.circleMarker([row['Latitude'], row['Longitude']], {
                radius: 5
            }).bindPopup(`<b>Location:</b> ${row['Location']}<br>
                          <b>Country:</b> ${row['Country']}<br>
                          <b>Longitude:</b> ${row['Longitude']}<br>
                          <b>Latitude:</b> ${row['Latitude']}`).addTo(map);
        });

        let centerLat = latSum / data.length;
        let centerLon = lonSum / data.length;
        map.setView([centerLat, centerLon], 2);
    } else {
        alert('No data available for the selected criteria.');
    }
}

function jsonToCsv(json) {
    const fields = Object.keys(json[0]);
    const replacer = (key, value) => value === null ? '' : value; 
    const csv = json.map(row => fields.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(fields.join(','));
    return csv.join('\r\n');
}

function downloadCsv() {
    const csv = jsonToCsv(filteredData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'filtered_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.getElementById('download-csv').addEventListener('click', downloadCsv);

function updateIndexOptions(criteriaGroup) {
    let period = criteriaGroup.querySelector('.period').value;
    let indexSelect = criteriaGroup.querySelector('.index');
    indexSelect.innerHTML = ''; // Clear existing options
    let indexOptions;
    switch (period) {
        case 'onset_heading':
            indexOptions = ['FD_1', 'ID_1', 'SU_1', 'DTmax35_1', 'TR_1', 'R5mm_1', 'R10mm_1', 'SDII_1', 'Rx5day_1', 'PRECtot_1', 'DTR_1', 'CDD_1', 'CWD_1'];
            break;
        // Add other cases as needed
    }
    indexOptions.forEach(option => {
        let optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        indexSelect.appendChild(optionElement);
    });

    // Bind change event to the index dropdown to update the slider
    indexSelect.addEventListener('change', function() {
        updateSliderRange(criteriaGroup);
    });

    // Update the slider range for the first time
    updateSliderRange(criteriaGroup);
}

function updateSliderRange(criteriaGroup) {
    let index = criteriaGroup.querySelector('.index').value;
    let rangeSlider = criteriaGroup.querySelector('.range-slider').noUiSlider;
    let [min, max] = indexRange[index] || [0, 278];

    rangeSlider.updateOptions({
        range: {
            'min': min,
            'max': max
        },
        start: [min, max]
    });

    const minValueSpan = criteriaGroup.querySelector('.min-value');
    const maxValueSpan = criteriaGroup.querySelector('.max-value');
    minValueSpan.textContent = min;
    maxValueSpan.textContent = max;
}

function addCriteria() {
    const criteriaContainer = document.getElementById('criteria-container');
    const newCriteria = document.createElement('div');
    newCriteria.classList.add('criteria-group');
    newCriteria.innerHTML = `
        <button class="delete-button" onclick="deleteCriteria(this)">X</button>
        <label for="period">Choose a period:</label>
        <select class="period">
            <option value="onset_heading">Onset - Heading</option>
            <option value="heading_flowerbeg">Heading - FlowerB</option>
            <option value="flowerend_grainfillbeg">FlowerE - GrainFillB</option>
            <option value="grainfillbeg_grainfillend">GrainFillB - GrainFillE</option>
        </select>
        <div style="margin-top: 20px;">
            <label for="index">Choose an index:</label>
            <select class="index">
                <!-- Index options will be dynamically populated here -->
            </select>
        </div>
        <div>
            <label for="range">Set the range:</label>
            <div class="range-slider"></div>
            <div class="range-values">
                <span class="min-value">0</span> - <span class="max-value">278</span>
            </div>
        </div>
    `;
    criteriaContainer.appendChild(newCriteria);

    // Initialize the slider before updating index options
    initializeSlider(newCriteria);

    // Ensure index options are updated correctly
    updateIndexOptions(newCriteria);

    // Attach event listener for period change
    newCriteria.querySelector('.period').addEventListener('change', function() {
        updateIndexOptions(newCriteria);
    });

    // Attach event listener for index change to update the slider
    newCriteria.querySelector('.index').addEventListener('change', function() {
        updateSliderRange(newCriteria);
    });
}

function deleteCriteria(button) {
    const criteriaGroup = button.parentElement;
    criteriaGroup.remove();
}

function initializeSlider(criteriaGroup) {
    const rangeSlider = criteriaGroup.querySelector('.range-slider');
    noUiSlider.create(rangeSlider, {
        start: [0, 278],
        connect: true,
        range: {
            'min': 0,
            'max': 278
        }
    });

    rangeSlider.noUiSlider.on('update', function(values, handle) {
        const minValueSpan = criteriaGroup.querySelector('.min-value');
        const maxValueSpan = criteriaGroup.querySelector('.max-value');
        minValueSpan.textContent = Math.round(values[0]);
        maxValueSpan.textContent = Math.round(values[1]);
    });
}

document.getElementById('add-criteria').addEventListener('click', addCriteria);

document.querySelectorAll('.criteria-group').forEach(group => {
    updateIndexOptions(group);
    initializeSlider(group);
});

document.querySelector('.criteria-group .period').addEventListener('change', function() {
    updateIndexOptions(document.querySelector('.criteria-group'));
});
