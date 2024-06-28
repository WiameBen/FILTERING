// Function to read JSON file
async function fetchData() {
    const response = await fetch('js/GD.json');
    const data = await response.json();
    return data;
}

function calculateHeatTolerance(data) {
    return data.map(location => {
        const l_heading_flowerbeg = location[`l_heading_flowerbeg`];
        const su = location[`SU_${l_heading_flowerbeg}`];
        const dtmax35 = location[`DTmax35_${l_heading_flowerbeg}`];
        
        let heatTolerant = false;
        
        if (l_heading_flowerbeg > 0) {
            // Calculate percentage of summer days
            const percentageSummerDays = (su / l_heading_flowerbeg) * 100;
            
            // Check for consecutive days above 35°C
            const daysAbove35C = dtmax35 >= 3;
            
            // Check if 10% of the days are above 35°C
            const tenPercentAbove35C = (dtmax35 / l_heading_flowerbeg) >= 0.1;
            
            heatTolerant = percentageSummerDays > 50 || daysAbove35C || tenPercentAbove35C;
        }
        
        return {
            ...location,
            HeatTolerantAtFlowering: heatTolerant
        };
    });
}

function calculateDroughtTolerance(data) {
    return data.map(location => {
        const l_flowerbeg_flowerend = location[`l_flowerbeg_flowerend`];
        const l_flowerend_grainfillbeg = location[`l_flowerend_grainfillbeg`];
        const l_grainfillbeg_grainfillend = location[`l_grainfillbeg_grainfillend`];
        const onset = location[`l_onset_heading`];
        
        // Calculate average total precipitation
        const avgPrecipitationAllPeriod = (location[`PRECtot_1`] + location[`PRECtot_2`] + location[`PRECtot_3`] + location[`PRECtot_4`] + location[`PRECtot_5`]) / 5;

        let droughtTolerant = false;

        if (avgPrecipitationAllPeriod >= 120 && avgPrecipitationAllPeriod <= 250) {
            const precFlowerToGrain = location[`PRECtot_3`] + location[`PRECtot_4`] + location[`PRECtot_5`];
            const noRainFlowerToGrain = precFlowerToGrain < 5;

            // Calculate total precipitation from Onset+15 to Onset+35
            const precOnsetPlus15To35 = location[`PRECtot_7`] - location[`PRECtot_6`];
            const noRainOnsetPlus15To35 = precOnsetPlus15To35 < 5;

            droughtTolerant = noRainFlowerToGrain || noRainOnsetPlus15To35;
        }

        return {
            ...location,
            DroughtTolerant: droughtTolerant
        };
    });
}

function convertToCSV(data) {
    const array = [Object.keys(data[0])].concat(data);

    return array.map(row => {
        return Object.values(row).map(value => {
            return typeof value === 'string' ? `"${value}"` : value;
        }).join(',');
    }).join('\n');
}

function downloadCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

async function main() {
    const data = await fetchData();
    const heatToleranceResults = calculateHeatTolerance(data);
    const droughtToleranceResults = calculateDroughtTolerance(data);

    const results = heatToleranceResults.map((heatResult, index) => ({
        ...heatResult,
        ...droughtToleranceResults[index]
    }));

    const map = L.map('map').setView([36.7266, 69.5373], 2);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);

    const markers = L.markerClusterGroup();

    results.forEach(result => {
        const marker = L.marker([result.Latitude, result.Longitude])
            .bindPopup(`Location: ${result.Location}<br>Heat Tolerant at Flowering: ${result.HeatTolerantAtFlowering ? 'Yes' : 'No'}<br>Drought Tolerant: ${result.DroughtTolerant ? 'Yes' : 'No'}`);
        marker.heatTolerant = result.HeatTolerantAtFlowering;
        marker.droughtTolerant = result.DroughtTolerant;
        markers.addLayer(marker);
    });

    map.addLayer(markers);

    function updateMarkers() {
        markers.clearLayers();
        const showHeatTolerantOnly = document.getElementById('heatToleranceFilter').checked;
        const showDroughtTolerantOnly = document.getElementById('droughtToleranceFilter').checked;
        
        results.forEach(result => {
            let showMarker = true;
            if (showHeatTolerantOnly && showDroughtTolerantOnly) {
                showMarker = result.HeatTolerantAtFlowering && result.DroughtTolerant;
            } else if (showHeatTolerantOnly) {
                showMarker = result.HeatTolerantAtFlowering;
            } else if (showDroughtTolerantOnly) {
                showMarker = result.DroughtTolerant;
            }
            if (showMarker) {
                const marker = L.marker([result.Latitude, result.Longitude])
                    .bindPopup(`Location: ${result.Location}<br>Heat Tolerant at Flowering: ${result.HeatTolerantAtFlowering ? 'Yes' : 'No'}<br>Drought Tolerant: ${result.DroughtTolerant ? 'Yes' : 'No'}`);
                markers.addLayer(marker);
            }
        });
    }

    document.getElementById('heatToleranceFilter').addEventListener('change', updateMarkers);
    document.getElementById('droughtToleranceFilter').addEventListener('change', updateMarkers);

    document.getElementById('downloadCsv').addEventListener('click', () => {
        const showHeatTolerantOnly = document.getElementById('heatToleranceFilter').checked;
        const showDroughtTolerantOnly = document.getElementById('droughtToleranceFilter').checked;
        const filteredData = results.filter(result => {
            if (showHeatTolerantOnly && showDroughtTolerantOnly) {
                return result.HeatTolerantAtFlowering && result.DroughtTolerant;
            } else if (showHeatTolerantOnly) {
                return result.HeatTolerantAtFlowering;
            } else if (showDroughtTolerantOnly) {
                return result.DroughtTolerant;
            }
            return true;
        });
        downloadCSV(filteredData, 'filtered_data.csv');
    });
}

// Run the main function
main();
