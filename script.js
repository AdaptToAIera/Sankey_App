document.addEventListener('DOMContentLoaded', () => {
    // --- Referencie na DOM elementy ---
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


    // --- Referencie na vstupy nastavení ---
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

    // Nastavenia grafu
    const graphSettings = {
        width: 960, height: 600, nodeWidth: 15, nodePadding: 10,
        nodeColor: '#4682B4', linkColorMode: 'solid', solidLinkColor: '#000000', linkOpacity: 0.5,
        showNodeLabels: true, showNodeValues: false, colorNodesBySource: false,
        labelFontSize: 10, labelFontFamily: 'sans-serif', labelColor: '#000000'
    };
     let nodeColorScale = null; // D3 ordinálna škála pre farbenie uzlov/liniek podľa kategórie

    // --- Definície Funkcií ---

    // Funkcia na inicializáciu UI nastavení s aktuálnymi hodnotami z graphSettings
    function initializeSettingsUI() {
        graphWidthInput.value = graphSettings.width;
        graphHeightInput.value = graphSettings.height;
        nodeWidthInput.value = graphSettings.nodeWidth;
        nodePaddingInput.value = graphSettings.nodePadding;
        nodeColorInput.value = graphSettings.nodeColor;
        linkColorModeSelect.value = graphSettings.linkColorMode;
        solidLinkColorInput.value = graphSettings.solidLinkColor;
        linkOpacityInput.value = graphSettings.linkOpacity;
        showNodeLabelsCheckbox.checked = graphSettings.showNodeLabels;
        showNodeValuesCheckbox.checked = graphSettings.showNodeValues;
        colorNodesBySourceCheckbox.checked = graphSettings.colorNodesBySource;
        labelFontSizeInput.value = graphSettings.labelFontSize;
        labelFontFamilyInput.value = graphSettings.labelFontFamily;
        labelColorInput.value = graphSettings.labelColor;
        updateLinkColorUI(); // Inicializovať aj zobrazenie UI farieb (skrytie/zobrazenie inputu)
    }

    // Handler pre zmenu akéhokoľvek nastavenia grafu v UI
    function handleSettingChange() {
        // Aktualizovať objekt graphSettings na základe hodnôt z UI
        graphSettings.width = parseInt(graphWidthInput.value) || 960;
        graphSettings.height = parseInt(graphHeightInput.value) || 600;
        graphSettings.nodeWidth = parseInt(nodeWidthInput.value) || 15;
        graphSettings.nodePadding = parseInt(nodePaddingInput.value) || 10;
        graphSettings.nodeColor = nodeColorInput.value;
        graphSettings.linkColorMode = linkColorModeSelect.value;
        graphSettings.solidLinkColor = solidLinkColorInput.value;
        graphSettings.linkOpacity = Math.max(0, Math.min(1, parseFloat(linkOpacityInput.value) || 0.5));
        graphSettings.showNodeLabels = showNodeLabelsCheckbox.checked;
        graphSettings.showNodeValues = showNodeValuesCheckbox.checked;
        graphSettings.colorNodesBySource = colorNodesBySourceCheckbox.checked;
        graphSettings.labelFontSize = parseInt(labelFontSizeInput.value) || 10;
        graphSettings.labelFontFamily = labelFontFamilyInput.value || 'sans-serif';
        graphSettings.labelColor = labelColorInput.value || '#000000';
        console.log("Nastavenia zmenené:", graphSettings);
        updateLinkColorUI(); // Aktualizovať zobrazenie UI pre farbu linky

         // Prekresliť graf s novými nastaveniami
         if (sourceColumnSelect.value !== "" && targetColumnSelect.value !== "" && valueColumnSelect.value !== "") {
             console.log("Zmena nastavení, prekresľujem graf.");
             // Spustiť prípravu dát a prekreslenie
             prepareSankeyDataAndDraw();
         }
    }

    // Funkcia na zobrazenie/skrytie inputu pre jednotnú farbu linky a stav inputu jednotnej farby uzla
     function updateLinkColorUI() {
          if (graphSettings.linkColorMode === 'solid') {
              solidLinkColorDiv.style.display = 'flex'; // Použiť flex pre zarovnanie
          } else {
              solidLinkColorDiv.style.display = 'none';
          }
          // Zablokovať/odblokovať input jednotnej farby uzla
          if (graphSettings.colorNodesBySource && graphSettings.linkColorMode === 'bySourceNode') {
               nodeColorInput.disabled = true;
               nodeColorInput.style.opacity = 0.5;
          } else {
               nodeColorInput.disabled = false;
               nodeColorInput.style.opacity = 1;
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

        renderDataTable(rawFileData, headers); // Vykresliť tabuľku
        populateColumnSelects(headers); // Nastaviť selecty (automaticky na Source/Target/Value)

        addRowBtn.style.display = 'inline-block';
        removeRowBtn.style.display = 'inline-block';

         // V ručnom režime sú stĺpce fixné, nastaviť selecty automaticky a zablokovať ich
         sourceColumnSelect.value = 0;
         targetColumnSelect.value = 1;
         valueColumnSelect.value = 2;
         sourceColumnSelect.disabled = true;
         targetColumnSelect.disabled = true;
         valueColumnSelect.disabled = true;


         fileInput.value = null; // Vyčistiť input súboru
         uploadStatus.textContent = 'Data sa zadávajú ručne.';
         uploadStatus.style.color = 'black';

         console.log("Tabuľka inicializovaná pre ručné zadávanie.");
    }

    // Handler pre nahrávanie súboru
    function handleFileSelect(event) {
        const files = event.target.files;
        if (files.length === 0) {
             // Ak zruší výber súboru, vrátime sa do ručného režimu
             resetApplicationState();
            return;
        }

        const file = files[0];
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        uploadStatus.textContent = `Nahrávam a spracovávam súbor: ${fileName}...`;
        uploadStatus.style.color = 'black';

        if (fileExtension !== 'csv' && fileExtension !== 'xlsx') {
            uploadStatus.textContent = 'Nepodporovaný formát súboru. Prosím, nahrajte CSV alebo XLSX.';
            uploadStatus.style.color = 'red';
            event.target.value = null;
            resetApplicationState(); // Vráti do ručného módu po chybe
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            const data = e.target.result;

            try {
                if (typeof XLSX === 'undefined') {
                     throw new Error("Knihovna SheetJS (XLSX) není načtena.");
                }

                const workbook = XLSX.read(data, { type: 'array', cellText: false, cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

                if (!jsonData || jsonData.length === 0) {
                    uploadStatus.textContent = 'Súbor je prázdny alebo neobsahuje žiadne dáta.';
                    uploadStatus.style.color = 'orange';
                    resetApplicationState(); // Vráti do ručného módu
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

                 if (fileData.length === 0) {
                     uploadStatus.textContent = 'Súbor neobsahuje žiadne riadky dát.';
                     uploadStatus.style.color = 'orange';
                     resetApplicationState(); // Vráti do ručného módu
                     return;
                 }

                 // Prepnutie do režimu súboru
                 isManualInputMode = false;
                 rawFileData = fileData;
                 const columnHeaders = fileHeaders; // Použiť hlavičky zo súboru

                 uploadStatus.textContent = `Súbor ${fileName} úspešne načítaný. ${rawFileData.length} riadkov dát.`;
                 uploadStatus.style.color = 'green';

                // Zobraziť všetky sekcie (už sú zobrazené v ručnom móde)
                dataSection.style.display = 'block';
                settingsSection.style.display = 'block';
                graphSection.style.display = 'block';
                exportSection.style.display = 'block';

                 // Skryť tlačidlá pre správu riadkov v režime súboru
                 addRowBtn.style.display = 'none';
                 removeRowBtn.style.display = 'none';

                 // Zobraziť dáta v tabuľke a nastaviť mapovanie stĺpcov zo súboru
                 renderDataTable(rawFileData, columnHeaders);
                 populateColumnSelects(columnHeaders); // Selecty sa naplnia hlavičkami zo súboru
                // Graf sa vykreslí automaticky po populateColumnSelects ak sú vybrané/predvyplnené

            } catch (e) {
                uploadStatus.textContent = `Chyba pri spracovaní súboru: ${e.message}`;
                uploadStatus.style.color = 'red';
                console.error("Chyba pri spracovaní súboru:", e);
                event.target.value = null; // Reset inputu súboru
                resetApplicationState(); // Vráti do ručného módu
            }
        };

        reader.onerror = function(e) {
            uploadStatus.textContent = 'Chyba pri čítaní súboru.';
            uploadStatus.style.color = 'red';
            console.error("Chyba pri čítaní súboru:", e);
            event.target.value = null; // Reset inputu súboru
            resetApplicationState(); // Vráti do ručného módu
        };

        reader.readAsArrayBuffer(file);
    }

    // Vykreslí dáta v HTML tabuľke
    function renderDataTable(data, headers) {
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
            sourceColumnSelect.disabled = true;
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
              sankeyGraphContainer.innerHTML = ''; // Vyčistiť kontajner grafu
              graphTooltip.style.display = 'none'; // Skryť tooltip
         }
    }

    // Handler pre zmenu výberu stĺpcov (volá sa len v režime súboru)
    function handleColumnMappingChange() {
         if (sourceColumnSelect.value !== "" && targetColumnSelect.value !== "" && valueColumnSelect.value !== "") {
              console.log("Všetky stĺpce pre graf boli vybrané. Pripravujem dáta a vykresľujem graf.");
              prepareSankeyDataAndDraw();
         } else {
              console.log("Čakám na výber všetkých stĺpcov pre graf.");
              sankeyGraphContainer.innerHTML = '';
              graphTooltip.style.display = 'none';
         }
    }

    // Pripraví dáta pre D3 Sankey layout a zavolá updateGraph
    function prepareSankeyDataAndDraw() {
         const sourceIndex = isManualInputMode ? 0 : parseInt(sourceColumnSelect.value);
         const targetIndex = isManualInputMode ? 1 : parseInt(targetColumnSelect.value);
         const valueIndex = isManualInputMode ? 2 : parseInt(valueColumnSelect.value);

         if (isNaN(sourceIndex) || isNaN(targetIndex) || isNaN(valueIndex)) {
              console.error("Nevalidné indexy stĺpcov pre Sankey.");
              sankeyGraphContainer.innerHTML = '';
              graphTooltip.style.display = 'none';
              return;
         }

         const links = [];
         const nodesMap = new Map(); // Na sledovanie unikátnych uzlov

         rawFileData.forEach((row, rowIndex) => {
             // Zabezpečiť, že stĺpec existuje v riadku pre daný index
             const sourceVal = (row[sourceIndex] !== null && row[sourceIndex] !== undefined) ? String(row[sourceIndex]).trim() : '';
             const targetVal = (row[targetIndex] !== null && row[targetIndex] !== undefined) ? String(row[targetIndex]).trim() : '';
             // parseFloat ignoruje text za číslom, čím umožňuje zadávať napr. "100 Eur"
             const valueRaw = (row[valueIndex] !== null && row[valueIndex] !== undefined) ? String(row[valueIndex]).trim().replace(',', '.') : '';
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
              sankeyGraphContainer.innerHTML = '';
              graphTooltip.style.display = 'none';
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
                   link.source = -1;
                   link.target = -1;
              }
         });

        // Filter pre istotu, ak by sa dostali neplatné linky
         const validLinks = links.filter(link => typeof link.source === 'object' && typeof link.target === 'object');


         const sankeyData = { nodes: nodes, links: validLinks };

         //console.log("Pripravené dáta pre Sankey:", JSON.parse(JSON.stringify(sankeyData))); // Logovať kópiu dát

         updateGraph(sankeyData); // Zavolať funkciu na vykreslenie/aktualizáciu grafu
    }


    // Vykreslí alebo aktualizuje Sankey graf pomocou D3.js
    function updateGraph(sankeyData) {
         // Kontrola, či sú kľúčové knižnice pre vykreslenie grafu načítané
         if (typeof d3 === 'undefined' || typeof d3.sankey === 'undefined') {
             console.error("Knihovna D3.js nebo její Sankey modul není načten.");
              sankeyGraphContainer.innerHTML = "Chyba pri načítaní knižnice D3.js Sankey.";
              graphTooltip.style.display = 'none';
             return;
         }

        if (!sankeyData || !sankeyData.nodes || !sankeyData.links || sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
             console.log("Dáta pre graf nie sú k dispozícii alebo sú prázdne po príprave.");
             sankeyGraphContainer.innerHTML = '';
              graphTooltip.style.display = 'none'; // Skryť tooltip, ak bol zobrazený
             return;
         }

        console.log("Vykresľujem/aktualizujem graf s nastaveniami:", graphSettings);

        const { width, height, nodeWidth, nodePadding, linkColorMode, solidLinkColor, linkOpacity, nodeColor, showNodeLabels, showNodeValues, colorNodesBySource, labelFontSize, labelFontFamily, labelColor } = graphSettings; // Rozbalenie aj nových nastavení


        // Vyčistiť predchádzajúci graf a skryť tooltip
        sankeyGraphContainer.innerHTML = '';
        graphTooltip.style.display = 'none'; // Skryť tooltip pri každom prekreslení


        const svg = d3.select("#sankeyGraphContainer")
                      .append("svg")
                      .attr("width", width)
                      .attr("height", height);

        const sankey = d3.sankey()
                         .nodeWidth(nodeWidth)
                         .nodePadding(nodePadding)
                         .extent([[1, 1], [width - 1, height - 5]]); // Rozsah vykreslenia


        // Spustiť layout - modifikuje sankeyData.nodes a sankeyData.links, pridá súradnice atď.
        sankey(sankeyData);

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
             link.attr("stroke", d => d.source.color || solidLinkColor); // Použiť priradenú farbu uzla, fallback na jednotnú
        }
        // TODO: Pridať ďalšie režimy farbenia liniek

         // --- Pridanie Event Listenerov pre Tooltip na Linky ---
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
             // Použiť priradenú farbu uzla, fallback na jednotnú farbu uzla
            node.attr("fill", d => d.color || nodeColor);
        } else {
            // Inak použiť jednotnú farbu uzla z nastavení
            node.attr("fill", nodeColor);
        }

        // --- Pridanie D3 Drag Behavior k Uzlom ---
        // Skontrolujeme, či je modul D3 Drag načítaný
        if (typeof d3.drag !== 'undefined') {
             node.call(d3.drag()
                 .subject(d => d) // Určí, ktorý dátový objekt je ťahaný (samotný uzol d)
                 .on("start", function(event, d) {
                      d3.select(this).raise(); // Presunie ťahaný element na vrch SVG
                      graphTooltip.style.display = 'none'; // Pri začiatku dragu skryť tooltip
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
                     sankey.update(sankeyData);

                     // Aktualizovať "d" atribút (cestu) všetkých liniek
                     svg.selectAll(".links path").attr("d", d3.sankeyLinkHorizontal());

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


         // --- Pridanie Textových Popisov k Uzlom (použitie nastavení fontu) ---
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
        renderDataTable(rawFileData, manualColumnHeaders);
        console.log("Riadok pridaný. Počet riadkov:", rawFileData.length);
         // Prekresliť graf, lebo pribudol riadok dát
         prepareSankeyDataAndDraw();
    }

    function removeRow() {
        if (rawFileData.length > 1) { // Zabezpečiť, aby ostal aspoň jeden riadok
            // Odstrániť posledný riadok z dát
            rawFileData.pop();
            // Prekresliť tabuľku
            renderDataTable(rawFileData, manualColumnHeaders);
             console.log("Posledný riadok odstránený. Počet riadkov:", rawFileData.length);
             // Prekresliť graf, lebo ubudol riadok dát
             prepareSankeyDataAndDraw();
        } else {
             console.log("Nemôžem odstrániť posledný riadok.");
        }
    }

    // Funkcie pre export grafu (SVG, PNG, JPG)
    function exportSVG() {
        const svgElement = sankeyGraphContainer.querySelector('svg');
        if (!svgElement) {
            console.error("SVG graf nebol nájdený.");
            return;
        }
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

        if (typeof saveAs !== 'undefined') {
            saveAs(blob, 'sankey_graph.svg');
            console.log("SVG graf exportovaný.");
        } else {
            console.error("FileSaver.js nie je načítaný. Export nie je možný.");
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = 'sankey_graph.svg';
             link.click();
             URL.revokeObjectURL(link.href);
        }
    }

    // Pomocná funkcia na export do PNG/JPG cez Canvas
    function exportCanvas(format = 'png') {
        const svgElement = sankeyGraphContainer.querySelector('svg');
         if (!svgElement) {
            console.error("SVG graf nebol nájdený pre export do Canvas.");
            return;
        }
         if (typeof saveAs === 'undefined') {
             console.error("FileSaver.js nie je načítaný. Export nie je možný.");
             return;
         }

        const width = parseInt(svgElement.getAttribute('width')) || graphSettings.width;
        const height = parseInt(svgElement.getAttribute('height')) || graphSettings.height;

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
            canvas.toBlob(function(blob) {
                const fileName = `sankey_graph.${format}`;
                saveAs(blob, fileName);
                 console.log(`${format.toUpperCase()} graf exportovaný.`);
            }, `image/${format}`, 0.95); // MIME typ a kvalita pre JPG (0-1)
        };

        img.onerror = function(error) {
            console.error(`Chyba pri načítaní SVG pre export do ${format.toUpperCase()}:`, error);
        };

        img.src = svgDataUrl; // Spustiť načítanie obrázka
    }

    // Resetuje stav aplikácie do režimu ručného zadávania
    function resetApplicationState() {
        // Sekcie dát, nastavení, grafu a exportu zostanú viditeľné

        dataTable.querySelector('thead').innerHTML = '';
        dataTable.querySelector('tbody').innerHTML = '';

        // Odstrániť existujúce poslucháče udalostí zo selectov
        sourceColumnSelect.removeEventListener('change', handleColumnMappingChange);
        targetColumnSelect.removeEventListener('change', handleColumnMappingChange);
        valueColumnSelect.removeEventListener('change', handleColumnMappingChange);

        sourceColumnSelect.innerHTML = '';
        targetColumnSelect.innerHTML = '';
        valueColumnSelect.innerHTML = '';

        sankeyGraphContainer.innerHTML = '';
        graphTooltip.style.display = 'none'; // Skryť tooltip

        // rawFileData sa nanovo inicializuje v initializeDataTableForManualInput
        rawFileData = null;
        // isManualInputMode sa nastaví na true v initializeDataTableForManualInput

        uploadStatus.textContent = '';
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
         settingsSection.style.display = 'none';
         graphSection.style.display = 'none';
         exportSection.style.display = 'none';
         // Tlačidlá správy riadkov a datová tabuľka zostanú viditeľné
     }

// --- Define the new handler function ---
function handleNodeLabelSettingChange() {
    // Update graphSettings object based on UI (similar to handleSettingChange)
    graphSettings.showNodeLabels = showNodeLabelsCheckbox.checked;
    graphSettings.showNodeValues = showNodeValuesCheckbox.checked;
    graphSettings.labelFontSize = parseInt(labelFontSizeInput.value) || 10;
    graphSettings.labelFontFamily = labelFontFamilyInput.value || 'sans-serif';
    graphSettings.labelColor = labelColorInput.value || '#000000';
    console.log("Nastavenia popisov zmenené:", graphSettings);

    // --- Update existing SVG labels directly ---
    const svg = d3.select("#sankeyGraphContainer svg");
    if (svg.empty()) {
        console.log("SVG nenájdené pre aktualizáciu popisov.");
        return; // No graph to update
    }

    const labelsGroup = svg.select(".labels");
    if (labelsGroup.empty()) {
        console.log("Skupina popisov (.labels) nenájdená.");
        return; // Labels group doesn't exist
    }

    // Update visibility
    labelsGroup.style("display", graphSettings.showNodeLabels ? "block" : "none");

    // Update font styles
    labelsGroup.attr("font-family", graphSettings.labelFontFamily)
               .attr("font-size", `${graphSettings.labelFontSize}px`)
               .attr("fill", graphSettings.labelColor);

    // Update text content (if showNodeValues changed)
    labelsGroup.selectAll("text")
        .text(d => {
            let text = d.name;
            if (graphSettings.showNodeValues && d.value !== undefined) {
                const formattedValue = Number.isInteger(d.value) ? d.value : d3.format(".1f")(d.value);
                text += ` (${formattedValue})`;
            }
            return text;
        });

    console.log("Popisy v grafe aktualizované bez prekreslenia layoutu.");
}


    // --- Kód vykonaný pri načítaní DOM ---

    // Kontrola knižníc a inicializácia UI na začiatku
    const isXlsxLoaded = typeof XLSX !== 'undefined';
    const isD3Loaded = typeof d3 !== 'undefined';
    const isSankeyLoaded = typeof d3.sankey !== 'undefined';
    const isDragLoaded = typeof d3.drag !== 'undefined';
    const isFileSaverLoaded = typeof saveAs !== 'undefined';

     console.log("SheetJS (XLSX) loaded:", isXlsxLoaded);
     console.log("D3.js loaded:", isD3Loaded);
     console.log("D3 Sankey module loaded:", isSankeyLoaded);
     console.log("D3 Drag module loaded:", isDragLoaded);
     console.log("FileSaver.js loaded:", isFileSaverLoaded);


    if (!isXlsxLoaded || !isD3Loaded || !isSankeyLoaded || !isDragLoaded || !isFileSaverLoaded) {
       let errorMessage = "Chyba pri načítaní knižníc:";
         if (!isXlsxLoaded) errorMessage += "\n- SheetJS (XLSX)";
         if (!isD3Loaded) errorMessage += "\n- D3.js (základ)";
         if (!isSankeyLoaded) errorMessage += "\n- D3 Sankey modul";
         if (!isDragLoaded) errorMessage += "\n- D3 Drag modul (Potrebný pre ťahanie uzlov)";
         if (!isFileSaverLoaded) errorMessage += "\n- FileSaver.js (Potrebný pre export)";
        errorMessage += "\nSkontrolujte cestu k nim v index.html a uistite sa, že D3 build obsahuje potrebné moduly.";


        uploadStatus.textContent = errorMessage;
        uploadStatus.style.color = 'red';

         disableGraphRelatedFeatures(); // Zablokovať grafické funkcie
         initializeDataTableForManualInput(); // Zobraziť tabuľku pre ručné zadávanie

    } else {
         // Ak sú všetky knižnice načítané
         initializeSettingsUI(); // Inicializovať UI nastavení

         // Pridať event listenery na exportné tlačidlá a tlačidlá pre správu riadkov
         exportSvgBtn.addEventListener('click', exportSVG);
         exportPngBtn.addEventListener('click', () => exportCanvas('png'));
         exportJpgBtn.addEventListener('click', () => exportCanvas('jpeg'));
         addRowBtn.addEventListener('click', addRow);
         removeRowBtn.addEventListener('click', removeRow);


         // Pridať event listenery pre zmenu nastavení grafu (tieto boli v minulom kóde mimo listenra, presunúť dnu)
         graphWidthInput.addEventListener('input', handleSettingChange);
         graphHeightInput.addEventListener('input', handleSettingChange);
         nodeWidthInput.addEventListener('input', handleSettingChange);
         nodePaddingInput.addEventListener('input', handleSettingChange);
         nodeColorInput.addEventListener('input', handleSettingChange);
         linkColorModeSelect.addEventListener('change', handleSettingChange);
         solidLinkColorInput.addEventListener('input', handleSettingChange);
         linkOpacityInput.addEventListener('input', handleSettingChange);
         colorNodesBySourceCheckbox.addEventListener('change', handleSettingChange);
         showNodeLabelsCheckbox.addEventListener('change', handleNodeLabelSettingChange);
showNodeValuesCheckbox.addEventListener('change', handleNodeLabelSettingChange);
labelFontSizeInput.addEventListener('input', handleNodeLabelSettingChange);
labelFontFamilyInput.addEventListener('input', handleNodeLabelSettingChange);
labelColorInput.addEventListener('input', handleNodeLabelSettingChange);
        // Poznámka: Ak sa menia len vlastnosti textu, nemusíme volať prepareSankeyDataAndDraw, stačí updateGraph
        // Urobme nový handler pre zmeny textových nastavení


         // Inicializovať tabuľku pre ručné zadávanie dát
         initializeDataTableForManualInput();
         // Zobraziť sekcie grafu, nastavení a exportu
          settingsSection.style.display = 'block';
          graphSection.style.display = 'block';
          exportSection.style.display = 'block';
          // Prvotné vykreslenie grafu sa spustí z initializeDataTableForManualInput
    }

}); // Koniec DOMContentLoaded listenera