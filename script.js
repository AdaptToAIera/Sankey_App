// script.js

// Zabalenie celého kódu do DOMContentLoaded listenra
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencie na DOM elementy ---
    // Získané až po načítaní DOM
    const fileInput = document.getElementById('fileInput');
    const uploadStatus = document.getElementById('uploadStatus');
    const dataSection = document.getElementById('data-section');
    const columnMappingSection = document.getElementById('columnMapping');
    const dataTableContainer = document.getElementById('dataTableContainer');
    const dataTable = document.getElementById('dataTable');
    const graphSection = document.getElementById('graph-section');
    const settingsSection = document.getElementById('settings-section');
    const exportSection = document.getElementById('export-section');
    const sourceColumnSelect = document.getElementById('sourceColumnSelect');
    const targetColumnSelect = document.getElementById('targetColumnSelect');
    const valueColumnSelect = document.getElementById('valueColumnSelect');
    const sankeyGraphContainer = document.getElementById('sankeyGraphContainer');
    const exportSvgBtn = document.getElementById('exportSvgBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const exportJpgBtn = document.getElementById('exportJpgBtn');
    const graphTooltip = document.getElementById('graphTooltip'); // Tooltip element

    // --- References to Data Table Controls ---
    const addRowBtn = document.getElementById('addRowBtn');
    const removeRowBtn = document.getElementById('removeRowBtn');


    // --- Referencie na vstupy nastavení grafu ---
    const graphWidthInput = document.getElementById('graphWidthInput');
    const graphHeightInput = document.getElementById('graphHeightInput');
    const nodeWidthInput = document.getElementById('nodeWidthInput');
    const nodePaddingInput = document.getElementById('nodePaddingInput');

    const nodeColorInput = document.getElementById('nodeColorInput');
    const linkColorModeSelect = document.getElementById('linkColorModeSelect');
    const solidLinkColorDiv = document.getElementById('solidLinkColorDiv');
    const solidLinkColorInput = document.getElementById('solidLinkColorInput');
    const linkOpacityInput = document.getElementById('linkOpacityInput');
    const showNodeLabelsCheckbox = document.getElementById('showNodeLabelsCheckbox');
    const showNodeValuesCheckbox = document.getElementById('showNodeValuesCheckbox');
    const colorNodesBySourceCheckbox = document.getElementById('colorNodesBySourceCheckbox');

    const labelFontSizeInput = document.getElementById('labelFontSizeInput');
    const labelFontFamilyInput = document.getElementById('labelFontFamilyInput');
    const labelColorInput = document.getElementById('labelColorInput');


    // --- Premenné stavu aplikácie ---
    let rawFileData = null; // Surové dáta (pole polí)
    const manualColumnHeaders = ['Source', 'Target', 'Value']; // Fixné hlavičky pre ručný mód
    let isManualInputMode = true; // Príznak, či sme v režime ručného zadávania

    // Nastavenia grafu (defaultné hodnoty)
    const graphSettings = {
        width: 960, height: 600, nodeWidth: 15, nodePadding: 10,
        nodeColor: '#4682B4', linkColorMode: 'solid', solidLinkColor: '#000000', linkOpacity: 0.5,
        showNodeLabels: true, showNodeValues: false, colorNodesBySource: false,
        labelFontSize: 10, labelFontFamily: 'sans-serif', labelColor: '#000000'
    };
     let nodeColorScale = null; // D3 ordinálna škála pre farbenie uzlov/liniek podľa kategórie


    // --- Definície Funkcií (všetky definované tu hore v rámci DOMContentLoaded) ---

    // Funkcia na inicializáciu UI nastavení s aktuálnymi hodnotami z graphSettings
    function initializeSettingsUI() {
        // Kontrolujeme, či elementy existujú predtým, ako k nim pristupujeme
        if (graphWidthInput) graphWidthInput.value = graphSettings.width;
        if (graphHeightInput) graphHeightInput.value = graphSettings.height;
        if (nodeWidthInput) nodeWidthInput.value = graphSettings.nodeWidth;
        if (nodePaddingInput) nodePaddingInput.value = graphSettings.nodePadding;

        if (nodeColorInput) nodeColorInput.value = graphSettings.nodeColor;
        if (linkColorModeSelect) linkColorModeSelect.value = graphSettings.linkColorMode;
        if (solidLinkColorInput) solidLinkColorInput.value = graphSettings.solidLinkColor;
        if (linkOpacityInput) linkOpacityInput.value = graphSettings.linkOpacity;
        if (showNodeLabelsCheckbox) showNodeLabelsCheckbox.checked = graphSettings.showNodeLabels;
        if (showNodeValuesCheckbox) showNodeValuesCheckbox.checked = graphSettings.showNodeValues;
        if (colorNodesBySourceCheckbox) colorNodesBySourceCheckbox.checked = graphSettings.colorNodesBySource;

        if (labelFontSizeInput) labelFontSizeInput.value = graphSettings.labelFontSize;
        if (labelFontFamilyInput) labelFontFamilyInput.value = graphSettings.labelFontFamily;
        if (labelColorInput) labelColorInput.value = graphSettings.labelColor;

        updateLinkColorUI(); // Inicializovať aj zobrazenie UI farieb (skrytie/zobrazenie inputu)
    }

     // Handler pre zmenu nastavení TÝKAJÚCICH SA LEN POPISKOV TEXTU
     // Táto funkcia nevolá prepareSankeyDataAndDraw(), ale priamo updateGraph() na prekreslenie popiskov
     // Použiť pre showNodeLabels, showNodeValues, labelFontSize, labelFontFamily, labelColor
    function handleNodeLabelSettingChange() {
        // Aktualizovať LEN nastavenia popiskov z UI
        if (showNodeLabelsCheckbox) graphSettings.showNodeLabels = showNodeLabelsCheckbox.checked;
        if (showNodeValuesCheckbox) graphSettings.showNodeValues = showNodeValuesCheckbox.checked;
        if (labelFontSizeInput) graphSettings.labelFontSize = parseInt(labelFontSizeInput.value) || 10;
        if (labelFontFamilyInput) graphSettings.labelFontFamily = labelFontFamilyInput.value || 'sans-serif';
        if (labelColorInput) graphSettings.labelColor = labelColorInput.value || '#000000';

        console.log("Nastavenia popiskov zmenené:", {
             showNodeLabels: graphSettings.showNodeLabels,
             showNodeValues: graphSettings.showNodeValues,
             labelFontSize: graphSettings.labelFontSize,
             labelFontFamily: graphSettings.labelFontFamily,
             labelColor: graphSettings.labelColor
        });

         // Prekresliť graf s novými nastaveniami popiskov
         // Ak sú už dáta pre graf pripravené (SVG element existuje)
         if (sankeyGraphContainer && sankeyGraphContainer.querySelector('svg')) {
             const svg = d3.select("#sankeyGraphContainer svg");
             const labelsGroup = svg.select(".labels");

             // Aktualizovať zobrazenie celej skupiny popiskov
             labelsGroup.style("display", graphSettings.showNodeLabels ? "block" : "none");

             if (graphSettings.showNodeLabels) {
                 // Ak sú popisky zobrazené, aktualizovať štýly a text jednotlivých popiskov
                 labelsGroup.selectAll("text")
                           .attr("font-family", graphSettings.labelFontFamily)
                           .attr("font-size", `${graphSettings.labelFontSize}px`)
                           .attr("fill", graphSettings.labelColor)
                           .text(d => { // Prepočítať text (hlavne ak sa zmenilo showNodeValues)
                               let text = d.name;
                               if (graphSettings.showNodeValues && d.value !== undefined) {
                                   const formattedValue = Number.isInteger(d.value) ? d.value : d3.format(".1f")(d.value);
                                   text += ` (${formattedValue})`;
                               }
                               return text;
                           });
             }
         }
    }


    // Handler pre zmenu nastavení TÝKAJÚCICH SA LAYOUTU ALEBO FARIEB UZLOV/LINIEK (okrem popiskov)
    // Táto funkcia volá prepareSankeyDataAndDraw() na prepočítanie layoutu a prekreslenie
    // Použiť pre width, height, nodeWidth, nodePadding, nodeColor, linkColorMode, solidLinkColor, linkOpacity, colorNodesBySource
    function handleLayoutOrColorSettingChange() {
        // Aktualizovať nastavenia z UI (všetky okrem popiskov, tie rieši handleNodeLabelSettingChange)
        if (graphWidthInput) graphSettings.width = parseInt(graphWidthInput.value) || 960;
        if (graphHeightInput) graphSettings.height = parseInt(graphHeightInput.value) || 600;
        if (nodeWidthInput) graphSettings.nodeWidth = parseInt(nodeWidthInput.value) || 15;
        if (nodePaddingInput) graphSettings.nodePadding = parseInt(nodePaddingInput.value) || 10;

        if (nodeColorInput) graphSettings.nodeColor = nodeColorInput.value;
        if (linkColorModeSelect) graphSettings.linkColorMode = linkColorModeSelect.value;
        if (solidLinkColorInput) graphSettings.solidLinkColor = solidLinkColorInput.value;
        if (linkOpacityInput) graphSettings.linkOpacity = Math.max(0, Math.min(1, parseFloat(linkOpacityInput.value) || 0.5));
        if (colorNodesBySourceCheckbox) graphSettings.colorNodesBySource = colorNodesBySourceCheckbox.checked;

        console.log("Nastavenia layoutu/farieb zmenené:", {
             width: graphSettings.width, height: graphSettings.height,
             nodeWidth: graphSettings.nodeWidth, nodePadding: graphSettings.nodePadding,
             nodeColor: graphSettings.nodeColor, linkColorMode: graphSettings.linkColorMode,
             solidLinkColor: graphSettings.solidLinkColor, linkOpacity: graphSettings.linkOpacity,
             colorNodesBySource: graphSettings.colorNodesBySource
        });

         updateLinkColorUI(); // Aktualizovať zobrazenie UI pre farbu linky

         // Prekresliť graf s novými nastaveniami layoutu/farieb
         // Vždy voláme prepareSankeyDataAndDraw, lebo zmena týchto nastavení môže ovplyvniť layout alebo farby uzlov/liniek
         if (sourceColumnSelect && sourceColumnSelect.value !== "" && targetColumnSelect && targetColumnSelect.value !== "" && valueColumnSelect && valueColumnSelect.value !== "") {
             console.log("Zmena nastavení, prekresľujem graf.");
             prepareSankeyDataAndDraw(); // Toto volá updateGraph
         }
    }


     // Funkcia na zobrazenie/skrytie inputu pre jednotnú farbu linky a stav inputu jednotnej farby uzla
     function updateLinkColorUI() {
          if (graphSettings.linkColorMode === 'solid') {
              if (solidLinkColorDiv) solidLinkColorDiv.style.display = 'flex'; // Použiť flex pre zarovnanie
          } else {
              if (solidLinkColorDiv) solidLinkColorDiv.style.display = 'none';
          }
          // Zablokovať/odblokovať input jednotnej farby uzla
          if (graphSettings.colorNodesBySource && graphSettings.linkColorMode === 'bySourceNode') {
               if (nodeColorInput) {
                   nodeColorInput.disabled = true;
                   nodeColorInput.style.opacity = 0.5;
               }
          } else {
              if (nodeColorInput) {
                   nodeColorInput.disabled = false;
                   nodeColorInput.style.opacity = 1;
              }
          }
     }

    // Inicializuje tabuľku s prázdnymi riadkami pre ručné zadávanie dát
    function initializeDataTableForManualInput() {
        isManualInputMode = true;
        // Ak je rawFileData null (prvý štart alebo reset), inicializovať
        // Ak už obsahuje dáta (z predchádzajúceho ručného zadania), ponechať ich
        if (rawFileData === null || rawFileData.length === 0) {
             rawFileData = [['', '', ''], ['', '', '']]; // Začať s niekoľkými prázdnymi riadkami
        }

        const headers = manualColumnHeaders; // Fixné hlavičky pre ručný mód

        if (dataTable) renderDataTable(rawFileData, headers); // Vykresliť tabuľku
        if (sourceColumnSelect) populateColumnSelects(headers); // Nastaviť selecty (automaticky na Source/Target/Value)

        if (addRowBtn) addRowBtn.style.display = 'inline-block';
        if (removeRowBtn) removeRowBtn.style.display = 'inline-block';

         // V ručnom režime sú stĺpce fixné, nastaviť selecty automaticky a zablokovať ich
         if (sourceColumnSelect) sourceColumnSelect.value = 0;
         if (targetColumnSelect) targetColumnSelect.value = 1;
         if (valueColumnSelect) valueColumnSelect.value = 2;
         if (sourceColumnSelect) sourceColumnSelect.disabled = true;
         if (targetColumnSelect) targetColumnSelect.disabled = true;
         if (valueColumnSelect) valueColumnSelect.disabled = true;


         if (fileInput) fileInput.value = null; // Vyčistiť input súboru
         if (uploadStatus) {
            uploadStatus.textContent = 'Data sa zadávajú ručne.';
            uploadStatus.style.color = 'black';
         }

         console.log("Tabuľka inicializovaná pre ručné zadávanie.");
    }

    // Handler pre nahrávanie súboru
    function handleFileSelect(event) {
        console.log("handleFileSelect started."); // Log na začiatku funkcie
        const files = event.target.files;
        if (files.length === 0) {
             console.log("No file selected."); // Log ak nie je vybraný súbor
             // Pri zrušení výberu súboru voláme resetApplicationState, čo vráti do ručného módu
             resetApplicationState();
            return;
        }

        const file = files[0];
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        console.log(`File selected: ${fileName}, Extension: ${fileExtension}`);


        if (uploadStatus) {
           uploadStatus.textContent = `Nahrávam a spracovávam súbor: ${fileName}...`;
           uploadStatus.style.color = 'black';
        }


        if (fileExtension !== 'csv' && fileExtension !== 'xlsx') {
            console.log("Unsupported file format.");
            if (uploadStatus) {
                uploadStatus.textContent = 'Nepodporovaný formát súboru. Prosím, nahrajte CSV alebo XLSX.';
                uploadStatus.style.color = 'red';
            }
            if (fileInput) event.target.value = null; // Reset inputu súboru
            resetApplicationState(); // Vráti do ručného módu po chybe
            return;
        }

        // Kontrola, či je knižnica SheetJS načítaná pred pokusom o čítanie
        if (typeof XLSX === 'undefined') {
            console.error("SheetJS (XLSX) library is not loaded. Cannot process file.");
            if (uploadStatus) {
                 uploadStatus.textContent = 'Chyba: Knižnica SheetJS (XLSX) nie je načítaná. Súbor nemožno spracovať.';
                 uploadStatus.style.color = 'red';
            }
             if (fileInput) event.target.value = null; // Reset inputu súboru
            resetApplicationState(); // Vráti do ručného módu
            return;
        }


        const reader = new FileReader();

        reader.onload = function(e) {
            console.log("FileReader onload triggered.");
            const data = e.target.result;

            try {
                console.log("Attempting to read workbook.");
                const workbook = XLSX.read(data, { type: 'array', cellText: false, cellDates: true });
                console.log("Workbook read successfully.", workbook);
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                console.log("First sheet name:", firstSheetName);

                console.log("Attempting to convert sheet to JSON.");
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
                console.log("Sheet converted to JSON.", jsonData);


                if (!jsonData || jsonData.length === 0) {
                    console.log("JSON data is empty.");
                     if (uploadStatus) {
                        uploadStatus.textContent = 'Súbor je prázdny alebo neobsahuje žiadne dáta.';
                        uploadStatus.style.color = 'orange';
                     }
                    resetApplicationState();
                    return;
                }

                 let potentialHeaders = jsonData[0];
                 let hasHeaders = potentialHeaders && potentialHeaders.every(cell => typeof cell === 'string' && cell.trim() !== '');
                 let fileHeaders;
                 let fileData;

                 if (hasHeaders) {
                     fileHeaders = potentialHeaders.map(h => String(h || '').trim() || `Stĺpec ${potentialHeaders.indexOf(h) + 1}`);
                     fileData = jsonData.slice(1); // Dáta bez hlavičky
                 } else {
                      fileHeaders = jsonData[0].map((_, i) => `Stĺpec ${i + 1}`);
                      fileData = jsonData;
                 }
                 console.log("Detected headers:", fileHeaders);
                 console.log("Extracted file data:", fileData);


                 if (fileData.length === 0) {
                      console.log("No data rows found after header check.");
                      if (uploadStatus) {
                        uploadStatus.textContent = 'Súbor neobsahuje žiadne riadky dát.';
                        uploadStatus.style.color = 'orange';
                      }
                    resetApplicationState();
                    return;
                 }

                 // Prepnutie do režimu súboru
                 isManualInputMode = false;
                 rawFileData = fileData;
                 const columnHeaders = fileHeaders;

                 if (uploadStatus) {
                    uploadStatus.textContent = `Súbor ${fileName} úspešne načítaný. ${rawFileData.length} riadkov dát.`;
                    uploadStatus.style.color = 'green';
                 }


                // Zobraziť všetky sekcie (už sú zobrazené v ručnom móde)
                // Kontrola, či elementy existujú pred nastavením display
                if (dataSection) dataSection.style.display = 'block';
                if (settingsSection) settingsSection.style.display = 'block';
                if (graphSection) graphSection.style.display = 'block';
                if (exportSection) exportSection.style.display = 'block';


                 // Skryť tlačidlá pre správu riadkov v režime súboru
                 if (addRowBtn) addRowBtn.style.display = 'none';
                 if (removeRowBtn) removeRowBtn.style.display = 'none';

                 // Zobraziť dáta v tabuľke a nastaviť mapovanie stĺpcov zo súboru
                 if (dataTable) renderDataTable(rawFileData, columnHeaders);
                 if (sourceColumnSelect) populateColumnSelects(columnHeaders); // Selecty sa naplnia hlavičkami zo súboru
                // Graf sa vykreslí automaticky po populateColumnSelects ak sú vybrané/predvyplnené

            } catch (e) {
                console.error(`Error processing file: ${e.message}`, e);
                 if (uploadStatus) {
                    uploadStatus.textContent = `Chyba pri spracovaní súboru: ${e.message}`;
                    uploadStatus.style.color = 'red';
                 }
                 if (fileInput) event.target.value = null;
                resetApplicationState(); // Vráti do ručného módu
            }
        };

        reader.onerror = function(e) {
            console.error("FileReader onerror triggered.", e);
             if (uploadStatus) {
                uploadStatus.textContent = 'Chyba pri čítaní súboru.';
                uploadStatus.style.color = 'red';
             }
             if (fileInput) event.target.value = null;
            resetApplicationState(); // Vráti do ručného módu
        };

        reader.readAsArrayBuffer(file); // Použiť ArrayBuffer pre SheetJS
        console.log("FileReader readAsArrayBuffer called.");
    }

    // Vykreslí dáta v HTML tabuľke
    function renderDataTable(data, headers) {
        if (!dataTable) { console.error("Data table element not found."); return; } // Kontrola
        const thead = dataTable.querySelector('thead');
        const tbody = dataTable.querySelector('tbody');

        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Pri ručnom režime vždy zobrazíme fixné 3 hlavičky, inak hlavičky zo súboru
        const displayHeaders = isManualInputMode ? manualColumnHeaders : headers;

        const headerRow = thead.insertRow();
        displayHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        data.forEach((rowData, rowIndex) => {
            const tr = tbody.insertRow();
            // Pri ručnom režime vždy iterujeme len 3 stĺpce (Source, Target, Value)
            // Pri režime zo súboru zobrazíme všetky stĺpce zo súboru
            const numColsToRender = isManualInputMode ? 3 : rowData.length;

            for (let colIndex = 0; colIndex < numColsToRender; colIndex++) {
                 const td = tr.insertCell();
                 td.contentEditable = "true";
                 td.dataset.rowIndex = rowIndex;
                 td.dataset.colIndex = colIndex;
                 // Získať hodnotu - ak riadok nemá dostatok stĺpcov, použiť prázdny reťazec
                 const cellData = rowData[colIndex] !== null && rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                 td.textContent = cellData;

                 // Pridať poslucháč udalosti pre editáciu bunky (po opustení bunky)
                 td.addEventListener('blur', handleCellEdit);
                 // Pridať aj poslucháč na "Enter" keypress na bunke, aby sa tiež spustil blur/update
                 td.addEventListener('keypress', function(event) {
                     if (event.key === 'Enter') {
                         event.preventDefault(); // Zabrániť novému riadku v contenteditable
                         event.target.blur(); // Spustiť blur udalosť
                     }
                 });
            }
        });
    }

    // Handler pre editáciu bunky v tabuľke
    function handleCellEdit(event) {
         const editedCell = event.target;
         const rowIndex = parseInt(editedCell.dataset.rowIndex);
         const colIndex = parseInt(editedCell.dataset.colIndex);
         const newValue = editedCell.textContent;

         if (rawFileData && rawFileData[rowIndex] !== undefined) {
              // Zabezpečiť, že riadok má dostatok stĺpcov pred aktualizáciou
               while (rawFileData[rowIndex].length <= colIndex) {
                    rawFileData[rowIndex].push(''); // Pridať prázdne stĺpce ak treba
               }

              rawFileData[rowIndex][colIndex] = newValue;

              // Pri ručnom režime sú stĺpce Source=0, Target=1, Value=2
              // Pri režime zo súboru sa indexy určia podľa výberu selectov
              const sourceIndex = isManualInputMode ? 0 : parseInt(sourceColumnSelect.value);
              const targetIndex = isManualInputMode ? 1 : parseInt(targetColumnSelect.value);
              const valueIndex = isManualInputMode ? 2 : parseInt(valueColumnSelect.value);

              // Ak bol editovaný stĺpec, ktorý sa používa pre graf, aktualizuj graf
              if (colIndex === sourceIndex || colIndex === targetIndex || colIndex === valueIndex) {
                  prepareSankeyDataAndDraw();
              }
              // Inak (editácia stĺpca, ktorý sa nepoužíva pre graf v režime súboru), graf netreba aktualizovať
         }
    }

    // Naplní selecty pre výber stĺpcov (rôzne pre ručný mód a súborový mód)
    function populateColumnSelects(headers) {
         if (!sourceColumnSelect || !targetColumnSelect || !valueColumnSelect) { console.error("Column select elements not found."); return; } // Kontrola

         // Odstrániť existujúce poslucháče, aby sa nezdvojovali
         sourceColumnSelect.removeEventListener('change', handleColumnMappingChange);
         targetColumnSelect.removeEventListener('change', handleColumnMappingChange);
         valueColumnSelect.removeEventListener('change', handleColumnMappingChange);

        sourceColumnSelect.innerHTML = '';
        targetColumnSelect.innerHTML = '';
        valueColumnSelect.innerHTML = '';

        const displayHeaders = isManualInputMode ? manualColumnHeaders : headers;

        const defaultOption = '<option value="">-- Vybrať stĺpec --</option>';
        // Defaultná možnosť "-- Vybrať stĺpec --" je len pri režime zo súboru
        if (!isManualInputMode) {
             sourceColumnSelect.innerHTML += defaultOption;
             targetColumnSelect.innerHTML += defaultOption;
             valueColumnSelect.innerHTML += defaultOption;
        }

        // Pridať možnosti na základe hlavičiek (fixných v ručnom móde, zo súboru v súborovom)
        displayHeaders.forEach((headerText, index) => {
            const option = `<option value="${index}">${headerText}</option>`;
            sourceColumnSelect.innerHTML += option;
            targetColumnSelect.innerHTML += option;
            valueColumnSelect.innerHTML += option;
        });

        // Pri ručnom režime sú stĺpce fixné (0, 1, 2), selecty sú disabled
        if (isManualInputMode) {
             // Selecty už sú disabled z initializeDataTableForManualInput, len nastaviť hodnoty
            sourceColumnSelect.value = 0;
            targetColumnSelect.value = 1;
            valueColumnSelect.value = 2;
             sourceColumnSelect.disabled = true; // Explicitne nastaviť disabled
             targetColumnSelect.disabled = true;
             valueColumnSelect.disabled = true;
        } else {
             // V režime súboru selecty odblokovať a pridať poslucháčov
             sourceColumnSelect.disabled = false;
             targetColumnSelect.disabled = false;
             valueColumnSelect.disabled = false;

             // --- Logika pre predvyplnenie stĺpcov (len v režime súboru) ---
             const lowerCaseHeaders = headers.map(h => String(h || '').toLowerCase()); // Zabezpečiť string a lowercase
             let preSelectedSource = null;
             let preSelectedTarget = null;
             let preSelectedValue = null;

             lowerCaseHeaders.forEach((header, index) => {
                 if (preSelectedSource === null && ['source', 'from', 'zdroj', 'povod'].includes(header)) { preSelectedSource = index; }
                 if (preSelectedTarget === null && ['target', 'to', 'cieľ', 'kam', 'do'].includes(header)) { preSelectedTarget = index; }
                 if (preSelectedValue === null && ['value', 'amount', 'hodnota', 'suma', 'pocet'].includes(header)) { preSelectedValue = index; }
             });

             if (preSelectedSource !== null) { sourceColumnSelect.value = preSelectedSource; }
             if (preSelectedTarget !== null) { targetColumnSelect.value = preSelectedTarget; }
             if (preSelectedValue !== null) { valueColumnSelect.value = preSelectedValue; }
             // --- Koniec logiky pre predvyplnenie ---
        }

         // Pridať poslucháče na zmenu výberu stĺpcov (len v režime súboru, kde sú odblokované)
        if (!isManualInputMode) {
             sourceColumnSelect.addEventListener('change', handleColumnMappingChange);
             targetColumnSelect.addEventListener('change', handleColumnMappingChange);
             valueColumnSelect.addEventListener('change', handleColumnMappingChange);
        }


         // Spustiť prvotné vykreslenie grafu, ak sú stĺpce vybrané (v ručnom móde sú vždy vybrané automaticky)
         if (sourceColumnSelect.value !== "" && targetColumnSelect.value !== "" && valueColumnSelect.value !== "") {
              console.log("Stĺpce sú vybrané. Pripravujem dáta a vykresľujem graf.");
              prepareSankeyDataAndDraw(); // Toto volá updateGraph
         } else {
              console.log("Čakám na výber všetkých stĺpcov pre graf.");
              if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = ''; // Vyčistiť kontajner grafu
              if (graphTooltip) graphTooltip.style.display = 'none'; // Skryť tooltip
         }
    }

    // Handler pre zmenu výberu stĺpcov (volá sa len v režime súboru)
    function handleColumnMappingChange() {
         // Táto funkcia sa volá len pri zmene selectov, čo sa v ručnom režime nedeje (sú disabled)
         // Volá sa po populateColumnSelects v režime súboru, alebo na začiatku init
         if (sourceColumnSelect && sourceColumnSelect.value !== "" && targetColumnSelect && targetColumnSelect.value !== "" && valueColumnSelect && valueColumnSelect.value !== "") {
              console.log("Všetky stĺpce pre graf boli vybrané. Pripravujem dáta a vykresľujem graf.");
              prepareSankeyDataAndDraw();
         } else {
              console.log("Čakám na výber všetkých stĺpcov pre graf.");
              if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = '';
              if (graphTooltip) graphTooltip.style.display = 'none';
         }
    }

    // Pripraví dáta pre D3 Sankey layout a zavolá updateGraph
    function prepareSankeyDataAndDraw() {
         // Kontrolujeme, či sú selecty k dispozícii predtým ako k nim pristupujeme
         const sourceIndex = isManualInputMode && sourceColumnSelect ? 0 : (sourceColumnSelect ? parseInt(sourceColumnSelect.value) : NaN);
         const targetIndex = isManualInputMode && targetColumnSelect ? 1 : (targetColumnSelect ? parseInt(targetColumnSelect.value) : NaN);
         const valueIndex = isManualInputMode && valueColumnSelect ? 2 : (valueColumnSelect ? parseInt(valueColumnSelect.value) : NaN);


         if (isNaN(sourceIndex) || isNaN(targetIndex) || isNaN(valueIndex)) {
              console.error("Nevalidné indexy stĺpcov pre Sankey.");
              if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = '';
              if (graphTooltip) graphTooltip.style.display = 'none';
              return;
         }

         const links = [];
         const nodesMap = new Map(); // Na sledovanie unikátnych uzlov

         if (!rawFileData) { // Ak nie sú dáta, vrátiť sa
              console.log("rawFileData is null, cannot prepare Sankey data.");
              if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = '';
              if (graphTooltip) graphTooltip.style.display = 'none';
              return;
         }


         rawFileData.forEach((row, rowIndex) => {
             // Zabezpečiť, že stĺpec existuje v riadku pre daný index
             const sourceVal = (row && row[sourceIndex] !== null && row[sourceIndex] !== undefined) ? String(row[sourceIndex]).trim() : '';
             const targetVal = (row && row[targetIndex] !== null && row[targetIndex] !== undefined) ? String(row[targetIndex]).trim() : '';
             // parseFloat ignoruje text za číslom, čím umožňuje zadávať napr. "100 Eur"
             const valueRaw = (row && row[valueIndex] !== null && row[valueIndex] !== undefined) ? String(row[valueIndex]).trim().replace(',', '.') : '';
             const valueVal = parseFloat(valueRaw);


             if (!sourceVal || !targetVal || isNaN(valueVal) || valueVal <= 0) {
                 //console.warn(`Preskočený riadok ${rowIndex + 1} kvôli nevalidným dátam.`);
                 return; // Ignorovať riadky bez platného zdroja, cieľa alebo hodnoty > 0
             }

             // Pridať uzly do mapy. Objekt uzla bude obsahovať meno a neskôr možno farbu
             if (!nodesMap.has(sourceVal)) {
                 nodesMap.set(sourceVal, { name: sourceVal });
             }
             if (!nodesMap.has(targetVal)) {
                 nodesMap.set(targetVal, { name: targetVal });
             }

             links.push({
                 sourceName: sourceVal, // Dočasne uložíme mená
                 targetName: targetVal,
                 value: valueVal
             });
         });

          if (nodesMap.size === 0 || links.length === 0) {
              console.log("Žiadne platné dáta pre vytvorenie Sankey grafu po filtrovaní.");
              if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = '';
              if (graphTooltip) graphTooltip.style.display = 'none';
              return;
         }

         const nodes = Array.from(nodesMap.values()); // Pole objektov uzlov

         // Ak je režim farbenia "bySourceNode" alebo "colorNodesBySource" je zapnutý, vytvoríme farebnú škálu pre uzly a priradíme farby
         if (graphSettings.linkColorMode === 'bySourceNode' || graphSettings.colorNodesBySource) {
               // Získame názvy všetkých uzlov, ktoré sa vyskytujú v linkoch, pre doménu škály
               const nodesInLinks = new Set(links.map(l => l.sourceName).concat(links.map(l => l.targetName)));
               const domainNames = Array.from(nodesInLinks);

              // Použijeme farebnú schému z D3
               const colorScheme = d3.schemeCategory10;
               if (domainNames.length > colorScheme.length) {
                   console.warn(`Počet unikátnych uzlov (${domainNames.length}) prekračuje počet farieb v schéme (${colorScheme.length}). Niektoré uzly budú mať rovnakú farbu.`);
               }

              // Skontrolujeme, či d3.scaleOrdinal existuje
              if (typeof d3.scaleOrdinal === 'function') {
                   nodeColorScale = d3.scaleOrdinal(colorScheme).domain(domainNames);

                   // Priradíme farbu každému uzlu
                   nodes.forEach(node => {
                        if (domainNames.includes(node.name)) {
                            node.color = nodeColorScale(node.name);
                        } else {
                            node.color = graphSettings.nodeColor; // Fallback farba pre uzly, ktoré nie sú v linkoch (ak také existujú)
                        }
                   });
              } else {
                   console.error("D3.js modul scaleOrdinal (potrebný pre farbenie podľa zdroja) nie je načítaný alebo nie je funkcia.");
                   nodeColorScale = null; // Zabezpečiť null, ak škála nefunguje
                    // V tomto prípade nepriradíme dynamické farby uzlom
                    nodes.forEach(node => { delete node.color; });
              }


         } else {
             // Ak sa nefarbí dynamicky, škálu vynulujeme a z uzlov odstránime pridanú farbu
             nodeColorScale = null;
              nodes.forEach(node => {
                  delete node.color;
              });
         }


         // Mapovať sourceName a targetName v linkoch na referencie na objekty uzlov z poľa 'nodes'
         links.forEach(link => {
              const sourceNode = nodes.find(node => node.name === link.sourceName);
              const targetNode = nodes.find(node => node.name === link.targetName);

              if (sourceNode && targetNode) {
                 link.source = sourceNode; // Odkaz na objekt uzla
                 link.target = targetNode; // Odkaz na objekt uzla
              } else {
                   // Ak by náhodou uzol nebol nájdený (nemalo by sa stať)
                   link.source = null; // Použijeme null namiesto -1 pre objekty
                   link.target = null;
              }
         });

        // Filter pre istotu, ak by sa dostali neplatné linky (s null source/target)
         const validLinks = links.filter(link => link.source !== null && link.target !== null);


         const sankeyData = { nodes: nodes, links: validLinks };

         //console.log("Pripravené dáta pre Sankey:", JSON.parse(JSON.stringify(sankeyData))); // Logovať kópiu dát

         updateGraph(sankeyData); // Zavolať funkciu na vykreslenie/aktualizáciu grafu
    }


    // Vykreslí alebo aktualizuje Sankey graf pomocou D3.js
    function updateGraph(sankeyData) {
         // Kontrola, či sú kľúčové knižnice pre vykreslenie grafu načítané
         if (typeof d3 === 'undefined' || typeof d3.sankey !== 'function') {
             console.error("Knihovna D3.js nebo její Sankey modul není načten/funkční. Nelze vykreslit graf.");
              if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = "Chyba pri načítaní knižnice D3.js Sankey.";
              if (graphTooltip) graphTooltip.style.display = 'none';
             return;
         }

        if (!sankeyData || !sankeyData.nodes || !sankeyData.links || sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
             console.log("Žiadne dáta pre graf alebo dáta sú prázdne po filtrovaní.");
             if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = '';
             if (graphTooltip) graphTooltip.style.display = 'none'; // Skryť tooltip, ak bol zobrazený
             return;
         }

        console.log("Vykresľujem/aktualizujem graf s nastaveniami:", graphSettings);

        const { width, height, nodeWidth, nodePadding, linkColorMode, solidLinkColor, linkOpacity, nodeColor, showNodeLabels, showNodeValues, colorNodesBySource, labelFontSize, labelFontFamily, labelColor } = graphSettings;


        // Vyčistiť predchádzajúci graf a skryť tooltip
        if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = '';
        if (graphTooltip) graphTooltip.style.display = 'none'; // Skryť tooltip pri každom prekreslení


        // Vytvorenie SVG elementu v kontajneri
        const svg = d3.select(sankeyGraphContainer).append("svg")
                      .attr("width", width)
                      .attr("height", height);

        // Vytvorenie Sankey layoutu
        const sankey = d3.sankey()
                         .nodeWidth(nodeWidth)
                         .nodePadding(nodePadding)
                         .extent([[1, 1], [width - 1, height - 5]]); // Rozsah vykreslenia


        // Spustiť layout - modifikuje sankeyData.nodes a sankeyData.links, pridá súradnice atď.
        // Skontrolujeme, či sankey je funkcia
        if (typeof sankey === 'function') {
            sankey(sankeyData);
        } else {
             console.error("D3 Sankey layout objekt nie je funkčný.");
              if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = "Chyba: D3 Sankey layout zlyhal.";
             return;
        }


        // --- Vykreslenie Linkov (s tooltipami) ---
        const link = svg.append("g")
                        .attr("class", "links") // CSS trieda pre štýlovanie
                        .attr("fill", "none") // Linky nemajú fill
                        .attr("stroke-opacity", linkOpacity) // Opacita z nastavení
                      .selectAll("path") // Vyber všetky path (ak existujú)
                      .data(sankeyData.links) // Naviaž dáta liniek
                      .join("path") // Pre existujúce path updatuj, pre nové pridaj, pre chýbajúce odstráň
                         .attr("d", d3.sankeyLinkHorizontal()) // Generátor cesty pre link
                         .attr("stroke-width", d => Math.max(0.5, d.width)) // Šírka linku podľa hodnoty
                         .sort((a, b) => b.width - a.width); // Zoradiť linky, aby hrubšie boli vzadu

        // Nastaviť farbu linky na základe režimu farbenia
        if (linkColorMode === 'solid') {
            link.attr("stroke", solidLinkColor); // Jednotná farba z nastavení
        } else if (linkColorMode === 'bySourceNode') {
            // Farba linky podľa farby zdrojového uzla (priradená v prepareSankeyDataAndDraw)
            // Použiť priradenú farbu uzla (d.source.color), fallback na jednotnú farbu linky ak chýba
             link.attr("stroke", d => d.source.color || solidLinkColor);
        }
        // TODO: Pridať ďalšie režimy farbenia liniek

         // --- Pridanie Event Listenerov pre Tooltip na Linky ---
         if (graphTooltip) { // Kontrola, či tooltip element existuje
             link.on("mouseover", function(event, d) {
                 graphTooltip.style.display = 'block'; // Zobraziť tooltip
                 const formattedValue = Number.isInteger(d.value) ? d.value : d3.format(".1f")(d.value);
                 graphTooltip.innerHTML = `<strong>${d.source.name}</strong> &rarr; <strong>${d.target.name}</strong><br>Hodnota: ${formattedValue}`;
             })
             .on("mousemove", function(event) {
                 graphTooltip.style.left = (event.pageX + 15) + 'px';
                 graphTooltip.style.top = (event.pageY + 15) + 'px';
             })
             .on("mouseleave", function() {
                 graphTooltip.style.display = 'none';
             });
         }


        // --- Vykreslenie Uzlov (s tooltipami a dragom) ---
        const node = svg.append("g")
                         .attr("class", "nodes") // CSS trieda pre štýlovanie
                       .selectAll("rect") // Vyber všetky rect (ak existujú)
                       .data(sankeyData.nodes) // Naviaž dáta uzlov
                       .join("rect") // Pre existujúce rect updatuj, pre nové pridaj, pre chýbajúce odstráň
                          .attr("x", d => d.x0) // x pozícia (ľavý okraj)
                          .attr("y", d => d.y0) // y pozícia (horný okraj)
                          .attr("height", d => d.y1 - d.y0) // výška
                          .attr("width", d => d.x1 - d.x0) // šírka (rovná nodeWidth)
                          .attr("stroke", "#000"); // Pridať čierny okraj uzlom

        // Nastaviť farbu uzla na základe nastavení
        if (colorNodesBySource && linkColorMode === 'bySourceNode') {
             // Ak chceme farbiť uzly podľa farby zdroja liniek (a režim liniek je podľa zdroja)
             // Použiť priradenú farbu uzla (d.color), fallback na jednotnú farbu uzla ak chýba
            node.attr("fill", d => d.color || nodeColor);
        } else {
            // Inak použiť jednotnú farbu uzla z nastavení
            node.attr("fill", nodeColor);
        }

        // --- Pridanie D3 Drag Behavior k Uzlom ---
        // Skontrolujeme, či je modul D3 Drag načítaný a funkcia existuje
        if (typeof d3.drag === 'function') {
             node.call(d3.drag()
                 .subject(d => d) // Určí, ktorý dátový objekt je ťahaný (samotný uzol d)
                 .on("start", function(event, d) {
                      d3.select(this).raise(); // Presunie ťahaný element na vrch SVG
                      if (graphTooltip) graphTooltip.style.display = 'none'; // Pri začiatku dragu skryť tooltip
                 })
                 .on("drag", function(event, d) {
                     // V Sankey typicky obmedzujeme ťahanie len vertikálne
                     const nodeHeight = d.y1 - d.y0;
                     // Obmedziť novú y0 pozíciu, aby uzol nešiel mimo graf
                     const newY0 = Math.max(0, Math.min(height - nodeHeight, event.y));

                     // Aktualizovať y0 pozíciu SVG elementu a dátového objektu
                     d3.select(this).attr("y", d.y0 = newY0);
                     // Aktualizovať y1 pozíciu v dátovom objekte (výška sa nemení)
                     d.y1 = d.y0 + nodeHeight;

                     // Informovať Sankey layout, aby prepočítal linky pripojené k ťahanému uzlu
                     // Skontrolujeme, či metóda update existuje
                     if (sankey && typeof sankey.update === 'function') {
                         sankey.update(sankeyData);
                          // Aktualizovať "d" atribút (cestu) všetkých liniek
                          svg.selectAll(".links path").attr("d", d3.sankeyLinkHorizontal());
                     } else {
                          console.error("D3 Sankey update metóda nie je dostupná.");
                     }


                     // Aktualizovať pozíciu popisku uzla
                      svg.selectAll(".labels text")
                         .filter(text_d => text_d === d) // Nájdi popisek pre tento dátový objekt uzla
                         .attr("x", text_d => text_d.x0 < width / 2 ? text_d.x1 + nodeWidth + 6 : text_d.x0 - 6) // x pozícia popisku
                         .attr("y", text_d => (text_d.y1 + text_d.y0) / 2); // y pozícia popisku


                 })
                 .on("end", function() {
                     // Volá sa na konci ťahania
                     // console.log("Drag ended", d.name);
                 })
             );
        } else {
            // Táto správa sa už loguje pri štarte, ak chýba modul
            // console.warn("D3 Drag modul nie je načítaný. Ťahanie uzlov nie je dostupné.");
        }

         // --- Pridanie Event Listenerov pre Tooltip na Uzly ---
         if (graphTooltip) { // Kontrola, či tooltip element existuje
             node.on("mouseover", function(event, d) {
                 graphTooltip.style.display = 'block';
                  const formattedValue = Number.isInteger(d.value) ? d.value : d3.format(".1f")(d.value);
                 graphTooltip.innerHTML = `<strong>${d.name}</strong><br>Hodnota: ${formattedValue}`;
             })
             .on("mousemove", function(event) {
                  graphTooltip.style.left = (event.pageX + 15) + 'px';
                 graphTooltip.style.top = (event.pageY + 15) + 'px';
             })
             .on("mouseleave", function() {
                 graphTooltip.style.display = 'none';
             });
         }


         // --- Vykreslenie Textových Popisov k Uzlom (použitie nastavení fontu) ---
         const labelsGroup = svg.append("g")
                            .attr("class", "labels") // CSS trieda pre štýlovanie
                            .style("display", showNodeLabels ? "block" : "none"); // Zobraziť/skryť podľa nastavenia

         const labels = labelsGroup
                           // Použiť nastavenia fontu z graphSettings
                           .attr("font-family", labelFontFamily)
                           .attr("font-size", `${labelFontSize}px`) // Nezabudnúť na 'px'
                           .attr("fill", labelColor) // Farba písma z nastavení
                         .selectAll("text") // Vyber všetky texty
                         .data(sankeyData.nodes) // Naviaž dáta uzlov
                         .join("text") // Pre existujúce texty updatuj, pre nové pridaj, pre chýbajúce odstráň
                           .attr("x", d => d.x0 < width / 2 ? d.x1 + nodeWidth + 6 : d.x0 - 6) // x pozícia popisku vedľa uzla
                           .attr("y", d => (d.y1 + d.y0) / 2) // y pozícia na stred uzla
                           .attr("dy", "0.35em") // Zarovnanie textu vertikálne
                           .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end"); // Zarovnanie textu horizontálne

         // Nastavenie samotného textového obsahu
         labels.text(d => {
             let text = d.name;
             if (showNodeValues && d.value !== undefined) {
                 const formattedValue = Number.isInteger(d.value) ? d.value : d3.format(".1f")(d.value);
                 text += ` (${formattedValue})`;
             }
             return text;
         });

          // Tooltipy sú pridané priamo na uzly a linky hore
          // Nemusíme ich pridávať aj na textové popisky, ak textové popisky neprekrývajú uzly/linky

    }

    // Funkcie pre správu riadkov (Pridaj/Odstráň)
    function addRow() {
        // Pridať nový prázdny riadok do dát
        rawFileData.push(['', '', '']);
        // Prekresliť tabuľku s fixnými hlavičkami pre ručný mód
        if (dataTable) renderDataTable(rawFileData, manualColumnHeaders);
        console.log("Riadok pridaný. Počet riadkov:", rawFileData.length);
         // Prekresliť graf, lebo pribudol riadok dát
         prepareSankeyDataAndDraw();
    }

    function removeRow() {
        if (rawFileData && rawFileData.length > 1) { // Zabezpečiť, aby ostal aspoň jeden riadok
            // Odstrániť posledný riadok z dát
            rawFileData.pop();
            // Prekresliť tabuľku
            if (dataTable) renderDataTable(rawFileData, manualColumnHeaders);
             console.log("Posledný riadok odstránený. Počet riadkov:", rawFileData.length);
             // Prekresliť graf, lebo ubudol riadok dát
             prepareSankeyDataAndDraw();
        } else {
             console.log("Nemôžem odstrániť posledný riadok. Musí zostať aspoň jeden.");
        }
    }

    // Funkcie pre export grafu (SVG, PNG, JPG)
    function exportSVG() {
        const svgElement = sankeyGraphContainer ? sankeyGraphContainer.querySelector('svg') : null;
        if (!svgElement) {
            console.error("SVG graf nebol nájdený pre export.");
            return;
        }
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

        if (typeof saveAs === 'function') {
            saveAs(blob, 'sankey_graph.svg');
            console.log("SVG graf exportovaný.");
        } else {
            console.error("FileSaver.js nie je načítaný alebo nie je funkcia. Export nie je možný.");
             // Alternatíva na stiahnutie bez FileSaver (nemusí fungovať všade ideálne)
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = 'sankey_graph.svg';
             document.body.appendChild(link); // Potrebné pridať do DOM pre .click() v niektorých prehliadačoch
             link.click();
             document.body.removeChild(link); // Odstrániť element
             URL.revokeObjectURL(link.href); // Uvoľniť URL objekt
        }
    }

    // Pomocná funkcia na export do PNG/JPG cez Canvas
    function exportCanvas(format = 'png') {
        const svgElement = sankeyGraphContainer ? sankeyGraphContainer.querySelector('svg') : null;
         if (!svgElement) {
            console.error("SVG graf nebol nájdený pre export do Canvas.");
            return;
        }
         if (typeof saveAs !== 'function') {
             console.error("FileSaver.js nie je načítaný alebo nie je funkcia. Export nie je možný.");
             return;
         }

        const width = parseInt(svgElement.getAttribute('width')) || (graphSettings ? graphSettings.width : 960);
        const height = parseInt(svgElement.getAttribute('height')) || (graphSettings ? graphSettings.height : 600);

        let svgString = new XMLSerializer().serializeToString(svgElement);
        // Ošetrenie špeciálnych znakov pre data URL
        const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

        const img = new Image();

        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');

            // Vyplniť pozadie (najmä pre JPG)
            if (format === 'jpeg') {
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, width, height);
            } else {
                 context.clearRect(0, 0, width, height); // Transparentné pre PNG
            }

            // Nakresliť obrázok (SVG) na Canvas
            context.drawImage(img, 0, 0, width, height);

            // Konvertovať Canvas na Blob v požadovanom formáte
            // Kontrola existencie canvas.toBlob
            if (typeof canvas.toBlob === 'function') {
                canvas.toBlob(function(blob) {
                    const fileName = `sankey_graph.${format}`;
                    saveAs(blob, fileName);
                     console.log(`${format.toUpperCase()} graf exportovaný.`);
                }, `image/${format}`, 0.95); // MIME typ a kvalita pre JPG (0-1)
            } else {
                 console.error("canvas.toBlob method not available. Cannot export to PNG/JPG.");
                 if (uploadStatus) {
                     uploadStatus.textContent = `Chyba: Váš prehliadač nepodporuje export do ${format.toUpperCase()}.`;
                     uploadStatus.style.color = 'red';
                 }
            }
        };

        img.onerror = function(error) {
            console.error(`Chyba pri načítaní SVG pre export do ${format.toUpperCase()}:`, error);
        };

        img.src = svgDataUrl; // Spustiť načítanie obrázka
    }

    // Resetuje stav aplikácie do režimu ručného zadávania
    function resetApplicationState() {
        // Sekcie dát, nastavení, grafu a exportu zostanú viditeľné

        if (dataTable) {
             dataTable.querySelector('thead').innerHTML = '';
             dataTable.querySelector('tbody').innerHTML = '';
        }


        // Odstrániť existujúce poslucháče udalostí zo selectov pred ich vyčistením/skrytím
        if (sourceColumnSelect) sourceColumnSelect.removeEventListener('change', handleColumnMappingChange);
        if (targetColumnSelect) targetColumnSelect.removeEventListener('change', handleColumnMappingChange);
        if (valueColumnSelect) valueColumnSelect.removeEventListener('change', handleColumnMappingChange);


        if (sourceColumnSelect) sourceColumnSelect.innerHTML = '';
        if (targetColumnSelect) targetColumnSelect.innerHTML = '';
        if (valueColumnSelect) valueColumnSelect.innerHTML = '';

        if (sankeyGraphContainer) sankeyGraphContainer.innerHTML = '';
        if (graphTooltip) graphTooltip.style.display = 'none'; // Skryť tooltip

        // rawFileData sa nanovo inicializuje v initializeDataTableForManualInput
        rawFileData = null;
        // isManualInputMode sa nastaví na true v initializeDataTableForManualInput

        if (uploadStatus) uploadStatus.textContent = '';
        nodeColorScale = null; // Vynulovať farebnú škálu

         // Resetovať nastavenia grafu UI na defaultné hodnoty v objekte A UI
         Object.assign(graphSettings, {
             width: 960, height: 600, nodeWidth: 15, nodePadding: 10,
             nodeColor: '#4682B4', linkColorMode: 'solid', solidLinkColor: '#000000', linkOpacity: 0.5,
             showNodeLabels: true, showNodeValues: false, colorNodesBySource: false,
             labelFontSize: 10, labelFontFamily: 'sans-serif', labelColor: '#000000'
         });
         initializeSettingsUI(); // Aktualizuje UI s týmito defaultnými hodnotami

         // Po resete prejsť do režimu ručného zadávania
         initializeDataTableForManualInput();
         // Graf sa po inicializácii tabuľky a výbere stĺpcov (auto v ručnom móde) sám prekreslí
    }

     // Zablokuje/skryje časti UI, ak chýbajú kľúčové JS knižnice
     function disableGraphRelatedFeatures() {
         if (settingsSection) settingsSection.style.display = 'none';
         if (graphSection) graphSection.style.display = 'none';
         if (exportSection) exportSection.style.display = 'none';

         // Zablokovať aj inputy v nastaveniach, ak sú zobrazené, ale graf nefunguje
         // Prípadne zobraziť overlay s chybovou správou
         // Zatiaľ len skryjeme sekcie, čo je najjednoduchšie.
     }


    // --- Kód vykonaný pri načítaní DOM ---

    // Kontrola knižníc
    const isXlsxLoaded = typeof XLSX !== 'undefined';
    const isD3Loaded = typeof d3 !== 'undefined';
    // Presnejšie kontroly pre D3 moduly a FileSaver
    const isSankeyLoaded = isD3Loaded && typeof d3.sankey === 'function';
    const isDragLoaded = isD3Loaded && typeof d3.drag === 'function';
    const isFileSaverLoaded = typeof saveAs === 'function';

     console.log("SheetJS (XLSX) loaded:", isXlsxLoaded);
     console.log("D3.js loaded:", isD3Loaded);
     console.log("D3 Sankey module loaded:", isSankeyLoaded);
     console.log("D3 Drag module loaded:", isDragLoaded);
     console.log("FileSaver.js loaded:", isFileSaverLoaded);


    // Pridať event listener pre nahrávanie súboru HNEĎ PO ZÍSKANÍ REFERENCIE
    // Tento listener by mal byť pridaný bez ohľadu na to, či sa ostatné knižnice načítali
    if (fileInput) { // Kontrola pre istotu, či bol element nájdený
         console.log('Attempting to add change listener to fileInput.');
         fileInput.addEventListener('change', handleFileSelect);
         console.log('Change listener added to fileInput.');
         // Resetovať file input pri štarte, aby sa nespustil change event pri prvom kliku, ak už bol súbor predtým vybraný
          fileInput.value = null;
    } else {
         console.error("File input element with ID 'fileInput' not found!");
         if (uploadStatus) {
            uploadStatus.textContent = "Chyba: HTML element pre nahrávanie súboru nebol nájdený.";
            uploadStatus.style.color = 'red';
         }
    }


    if (!isXlsxLoaded || !isD3Loaded || !isSankeyLoaded || !isDragLoaded || !isFileSaverLoaded) {
       let errorMessage = "Chyba pri načítaní knižníc:";
         if (!isXlsxLoaded) errorMessage += "\n- SheetJS (XLSX) - Nahrávanie súborov nebude funkčné";
         if (!isD3Loaded) errorMessage += "\n- D3.js (základ) - Graf nebude funkčný";
         if (!isSankeyLoaded) errorMessage += "\n- D3 Sankey modul - Graf nebude funkčný";
         if (!isDragLoaded) errorMessage += "\n- D3 Drag modul - Ťahanie uzlov nebude funkčné";
         if (!isFileSaverLoaded) errorMessage += "\n- FileSaver.js - Export nebude funkčný";
        errorMessage += "\nSkontrolujte cestu k nim v index.html a uistite sa, že D3 build obsahuje potrebné moduly.";


        if (uploadStatus) {
             // Ak už je tam správa "Data sa zadávajú ručne", pridať chybu pod to
            if (uploadStatus.textContent && uploadStatus.textContent.includes('Data sa zadávajú ručne')) {
                uploadStatus.innerHTML += "<br>" + errorMessage.replace(/\n/g, "<br>"); // Použiť innerHTML pre zalomenie riadkov
            } else {
                 uploadStatus.textContent = errorMessage;
            }
            uploadStatus.style.color = 'red'; // Hlavná farba chyby
        }


         disableGraphRelatedFeatures(); // Zablokovať grafické funkcie
         initializeDataTableForManualInput(); // Zobraziť tabuľku pre ručné zadávanie (stále funkčné)

    } else {
         // Ak sú všetky knižnice načítané a funkčné
         initializeSettingsUI(); // Inicializovať UI nastavení

         // Pridať event listenery na exportné tlačidlá a tlačidlá pre správu riadkov
         if (exportSvgBtn) exportSvgBtn.addEventListener('click', exportSVG);
         if (exportPngBtn) exportPngBtn.addEventListener('click', () => exportCanvas('png'));
         if (exportJpgBtn) exportJpgBtn.addEventListener('click', () => exportCanvas('jpeg'));
         if (addRowBtn) addRowBtn.addEventListener('click', addRow);
         if (removeRowBtn) removeRowBtn.addEventListener('click', removeRow);

         // Pridať event listenery pre zmenu nastavení grafu (odlíšené handlery)
         if (graphWidthInput) graphWidthInput.addEventListener('input', handleLayoutOrColorSettingChange);
         if (graphHeightInput) graphHeightInput.addEventListener('input', handleLayoutOrColorSettingChange);
         if (nodeWidthInput) nodeWidthInput.addEventListener('input', handleLayoutOrColorSettingChange);
         if (nodePaddingInput) nodePaddingInput.addEventListener('input', handleLayoutOrColorSettingChange);
         if (nodeColorInput) nodeColorInput.addEventListener('input', handleLayoutOrColorSettingChange);
         if (linkColorModeSelect) linkColorModeSelect.addEventListener('change', handleLayoutOrColorSettingChange);
         if (solidLinkColorInput) solidLinkColorInput.addEventListener('input', handleLayoutOrColorSettingChange);
         if (linkOpacityInput) linkOpacityInput.addEventListener('input', handleLayoutOrColorSettingChange);
         if (colorNodesBySourceCheckbox) colorNodesBySourceCheckbox.addEventListener('change', handleLayoutOrColorSettingChange);

         // Listenery pre nastavenia popiskov (volajú špeciálny handler)
         if (showNodeLabelsCheckbox) showNodeLabelsCheckbox.addEventListener('change', handleNodeLabelSettingChange);
         if (showNodeValuesCheckbox) showNodeValuesCheckbox.addEventListener('change', handleNodeLabelSettingChange);
         if (labelFontSizeInput) labelFontSizeInput.addEventListener('input', handleNodeLabelSettingChange);
         if (labelFontFamilyInput) labelFontFamilyInput.addEventListener('input', handleNodeLabelSettingChange);
         if (labelColorInput) labelColorInput.addEventListener('input', handleNodeLabelSettingChange);


         initializeDataTableForManualInput();
         // Zobraziť sekcie grafu, nastavení a exportu
          if (settingsSection) settingsSection.style.display = 'block';
          if (graphSection) graphSection.style.display = 'block';
          if (exportSection) exportSection.style.display = 'block';
          // Prvotné vykreslenie grafu sa spustí z initializeDataTableForManualInput volaním populateColumnSelects -> prepareSankeyDataAndDraw
    }

}); // Koniec DOMContentLoaded listenera