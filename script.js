document.addEventListener('DOMContentLoaded', () => {
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
    const exportSvgBtn = document.getElementById('exportSvgBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const exportJpgBtn = document.getElementById('exportJpgBtn'); // Referencia na JPG tlačidlo


    // --- Referencie na vstupy nastavení ---
    const graphWidthInput = document.getElementById('graphWidthInput');
    const graphHeightInput = document.getElementById('graphHeightInput');
    const nodeWidthInput = document.getElementById('nodeWidthInput');
    const nodePaddingInput = document.getElementById('nodePaddingInput');

    const nodeColorInput = document.getElementById('nodeColorInput'); // Jednotná farba uzlov
    const linkColorModeSelect = document.getElementById('linkColorModeSelect'); // Režim farbenia liniek
    const solidLinkColorDiv = document.getElementById('solidLinkColorDiv'); // Kontajner pre jednotnú farbu liniek
    const solidLinkColorInput = document.getElementById('solidLinkColorInput'); // Input jednotnej farby liniek
    const linkOpacityInput = document.getElementById('linkOpacityInput'); // Opacita liniek
    const showNodeLabelsCheckbox = document.getElementById('showNodeLabelsCheckbox');
    const showNodeValuesCheckbox = document.getElementById('showNodeValuesCheckbox');
    const colorNodesBySourceCheckbox = document.getElementById('colorNodesBySourceCheckbox'); // Farbiť uzly podľa farby zdrojovej linky


    let rawFileData = null; // Surové dáta z parslovaného súboru (pole polí)
    let columnHeaders = []; // Názvy stĺpcov

    // Nastavenia grafu - hodnoty budeme synchronizovať s UI
    const graphSettings = {
        width: 960,
        height: 600,
        nodeWidth: 15,
        nodePadding: 10,
        nodeColor: '#4682B4', // Default steelblue (pre jednotnú farbu uzlov)
        linkColorMode: 'solid', // 'solid' alebo 'bySourceNode'
        solidLinkColor: '#000000', // Default čierna (pre jednotnú farbu liniek)
        linkOpacity: 0.5,
        showNodeLabels: true,
        showNodeValues: false,
        colorNodesBySource: false // Default: uzly sa nefarbia podľa zdroja liniek
    };

     // Objekt na uloženie farebnej škály pre uzly, ak sa farbia dynamicky
     let nodeColorScale = null;


     // Kontrola, či sa načínali knižnice
     console.log("SheetJS (XLSX) loaded:", typeof XLSX !== 'undefined');
     console.log("D3.js loaded:", typeof d3 !== 'undefined');
     console.log("D3 Sankey module loaded:", typeof d3.sankey !== 'undefined');
     console.log("D3 Drag module loaded:", typeof d3.drag !== 'undefined');
     console.log("FileSaver.js loaded:", typeof saveAs !== 'undefined'); // Kontrola pre FileSaver

    if (typeof XLSX === 'undefined' || typeof d3 === 'undefined' || typeof d3.sankey === 'undefined' || typeof d3.drag === 'undefined' || typeof saveAs === 'undefined') {
        let errorMessage = "Chyba: Potrebné knižnice neboli správne načteny. Skontrolujte cestu k nim v index.html.";
         if (typeof XLSX === 'undefined') errorMessage += "\n- SheetJS (XLSX)";
         if (typeof d3 === 'undefined') errorMessage += "\n- D3.js";
         if (typeof d3.sankey === 'undefined') errorMessage += "\n- D3 Sankey modul";
         if (typeof d3.drag === 'undefined') errorMessage += "\n- D3 Drag modul";
         if (typeof saveAs === 'undefined') errorMessage += "\n- FileSaver.js (prosím, odkomentujte ho v index.html a uistite sa, že je v libs/ adresári)";

        uploadStatus.textContent = errorMessage;
        uploadStatus.style.color = 'red';

    } else {
         initializeSettingsUI();
         // Ak sú knižnice načítané, pridáme event listenery na exportné tlačidlá
         exportSvgBtn.addEventListener('click', exportSVG);
         exportPngBtn.addEventListener('click', () => exportCanvas('png')); // Použijeme pomocnú funkciu
         exportJpgBtn.addEventListener('click', () => exportCanvas('jpeg')); // Použijeme pomocnú funkciu
    }


    // --- Event Listener pre nahrávanie súboru ---
    fileInput.addEventListener('change', handleFileSelect);

    // --- Event Listenery pre zmenu mapovania stĺpcov ---
    // Poslucháče sa pridávajú vo funkcii populateColumnSelects

    // --- Event Listenery pre zmenu nastavení grafu ---
    graphWidthInput.addEventListener('input', handleSettingChange);
    graphHeightInput.addEventListener('input', handleSettingChange);
    nodeWidthInput.addEventListener('input', handleSettingChange);
    nodePaddingInput.addEventListener('input', handleSettingChange);

    nodeColorInput.addEventListener('input', handleSettingChange); // Jednotná farba uzlov
    linkColorModeSelect.addEventListener('change', handleSettingChange); // Zmena režimu farbenia liniek
    solidLinkColorInput.addEventListener('input', handleSettingChange); // Jednotná farba liniek
    linkOpacityInput.addEventListener('input', handleSettingChange); // Opacita liniek
    colorNodesBySourceCheckbox.addEventListener('change', handleSettingChange); // Farbiť uzly podľa zdroja

    showNodeLabelsCheckbox.addEventListener('change', handleSettingChange);
    showNodeValuesCheckbox.addEventListener('change', handleSettingChange);

    fileInput.addEventListener('change', handleFileSelect);


    // --- Funkcie pre UI a dáta ---

    function handleFileSelect(event) {
        const files = event.target.files;
        if (files.length === 0) {
            uploadStatus.textContent = 'Nebol vybraný žiadny súbor.';
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
            resetApplicationState();
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
                    resetApplicationState();
                    return;
                }

                 let potentialHeaders = jsonData[0];
                 let hasHeaders = potentialHeaders && potentialHeaders.every(cell => typeof cell === 'string' && cell.trim() !== '');

                 if (hasHeaders) {
                     columnHeaders = potentialHeaders.map(h => String(h || '').trim() || `Stĺpec ${potentialHeaders.indexOf(h) + 1}`);
                     rawFileData = jsonData.slice(1);
                 } else {
                      columnHeaders = jsonData[0].map((_, i) => `Stĺpec ${i + 1}`);
                      rawFileData = jsonData;
                 }

                 if (rawFileData.length === 0 && hasHeaders) { // Ak boli hlavičky, ale pod nimi už nič
                      uploadStatus.textContent = 'Súbor obsahuje iba hlavičku, žiadne riadky dát.';
                      uploadStatus.style.color = 'orange';
                      resetApplicationState();
                      return;
                 } else if (rawFileData.length === 0 && !hasHeaders) { // Ak neboli hlavičky a súbor je prázdny
                     uploadStatus.textContent = 'Súbor je prázdny.';
                     uploadStatus.style.color = 'orange';
                     resetApplicationState();
                     return;
                 }


                uploadStatus.textContent = `Súbor úspešne načítaný. ${rawFileData.length} riadkov dát (bez hlavičky, ak bola detekovaná).`;
                uploadStatus.style.color = 'green';

                // Zobraziť ďalšie sekcie
                dataSection.style.display = 'block';
                settingsSection.style.display = 'block';
                graphSection.style.display = 'block';
                exportSection.style.display = 'block';

                 // Zobraziť/skryť input pre jednotnú farbu linky na základe defaultného nastavenia
                 updateLinkColorUI();


                // Zobraziť dáta v tabuľke a nastaviť mapovanie stĺpcov
                renderDataTable(rawFileData, columnHeaders);
                populateColumnSelects(columnHeaders);

            } catch (e) {
                uploadStatus.textContent = `Chyba pri spracovaní súboru: ${e.message}`;
                uploadStatus.style.color = 'red';
                console.error("Chyba pri spracovaní súboru:", e);
                resetApplicationState();
            } finally {
                 event.target.value = null; // Reset inputu v každom prípade
            }
        };

        reader.onerror = function(e) {
            uploadStatus.textContent = 'Chyba pri čítaní súboru.';
            uploadStatus.style.color = 'red';
            console.error("Chyba pri čítaní súboru:", e);
            event.target.value = null;
            resetApplicationState();
        };

        reader.readAsArrayBuffer(file); // Použiť ArrayBuffer pre SheetJS
    }

    function renderDataTable(data, headers) {
        const thead = dataTable.querySelector('thead');
        const tbody = dataTable.querySelector('tbody');

        thead.innerHTML = '';
        tbody.innerHTML = '';

        const headerRow = thead.insertRow();
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        data.forEach((rowData, rowIndex) => {
            const tr = tbody.insertRow();
            rowData.forEach((cellData, colIndex) => {
                 const td = tr.insertCell();
                 td.contentEditable = "true";
                 td.dataset.rowIndex = rowIndex;
                 td.dataset.colIndex = colIndex;
                 td.textContent = cellData !== null && cellData !== undefined ? cellData : '';

                 td.addEventListener('blur', handleCellEdit);
            });
        });
    }

    function handleCellEdit(event) {
         const editedCell = event.target;
         const rowIndex = parseInt(editedCell.dataset.rowIndex);
         const colIndex = parseInt(editedCell.dataset.colIndex);
         const newValue = editedCell.textContent;

         if (rawFileData && rawFileData[rowIndex]) {
              rawFileData[rowIndex][colIndex] = newValue;

              const sourceIndex = parseInt(sourceColumnSelect.value);
              const targetIndex = parseInt(targetColumnSelect.value);
              const valueIndex = parseInt(valueColumnSelect.value);

              if (colIndex === sourceIndex || colIndex === targetIndex || colIndex === valueIndex) {
                  prepareSankeyDataAndDraw();
              }
         }
    }


    function populateColumnSelects(headers) {
         sourceColumnSelect.removeEventListener('change', handleColumnMappingChange);
         targetColumnSelect.removeEventListener('change', handleColumnMappingChange);
         valueColumnSelect.removeEventListener('change', handleColumnMappingChange);

        sourceColumnSelect.innerHTML = '';
        targetColumnSelect.innerHTML = '';
        valueColumnSelect.innerHTML = '';

        const defaultOption = '<option value="">-- Vybrať stĺpec --</option>';
        sourceColumnSelect.innerHTML += defaultOption;
        targetColumnSelect.innerHTML += defaultOption;
        valueColumnSelect.innerHTML += defaultOption;

        headers.forEach((headerText, index) => {
            const option = `<option value="${index}">${headerText}</option>`;
            sourceColumnSelect.innerHTML += option;
            targetColumnSelect.innerHTML += option;
            valueColumnSelect.innerHTML += option;
        });

        // --- Logika pre predvyplnenie stĺpcov ---
        const lowerCaseHeaders = headers.map(h => h.toLowerCase());
        let preSelectedSource = null;
        let preSelectedTarget = null;
        let preSelectedValue = null;

        lowerCaseHeaders.forEach((header, index) => {
            if (preSelectedSource === null && ['source', 'from', 'zdroj', 'povod'].includes(header)) {
                preSelectedSource = index;
            }
            if (preSelectedTarget === null && ['target', 'to', 'cieľ', 'kam', 'do'].includes(header)) {
                preSelectedTarget = index;
            }
            if (preSelectedValue === null && ['value', 'amount', 'hodnota', 'suma', 'pocet'].includes(header)) {
                preSelectedValue = index;
            }
        });

        if (preSelectedSource !== null) {
            sourceColumnSelect.value = preSelectedSource;
        }
        if (preSelectedTarget !== null) {
            targetColumnSelect.value = preSelectedTarget;
        }
        if (preSelectedValue !== null) {
            valueColumnSelect.value = preSelectedValue;
        }
        // --- Koniec logiky pre predvyplnenie ---

        sourceColumnSelect.addEventListener('change', handleColumnMappingChange);
        targetColumnSelect.addEventListener('change', handleColumnMappingChange);
        valueColumnSelect.addEventListener('change', handleColumnMappingChange);

         if (sourceColumnSelect.value !== "" && targetColumnSelect.value !== "" && valueColumnSelect.value !== "") {
              console.log("Stĺpce boli automaticky vybrané. Vykresľujem graf.");
              prepareSankeyDataAndDraw();
         } else {
              console.log("Automatický výber stĺpcov zlyhal alebo sú niektoré stĺpce nevybrané. Prosím, vyberte stĺpce ručne.");
              sankeyGraphContainer.innerHTML = ''; // Vyčistiť kontajner
         }
    }

    function handleColumnMappingChange() {
         if (sourceColumnSelect.value !== "" && targetColumnSelect.value !== "" && valueColumnSelect.value !== "") {
              console.log("Všetky stĺpce pre graf boli vybrané. Pripravujem dáta a vykresľujem graf.");
              prepareSankeyDataAndDraw();
         } else {
              console.log("Čakám na výber všetkých stĺpcov pre graf.");
              sankeyGraphContainer.innerHTML = ''; // Vyčistiť kontajner
         }
    }

    function prepareSankeyDataAndDraw() {
         const sourceIndex = parseInt(sourceColumnSelect.value);
         const targetIndex = parseInt(targetColumnSelect.value);
         const valueIndex = parseInt(valueColumnSelect.value);

         if (isNaN(sourceIndex) || isNaN(targetIndex) || isNaN(valueIndex)) {
              console.error("Nevalidné indexy stĺpcov pre Sankey.");
              sankeyGraphContainer.innerHTML = '';
              return;
         }

         const links = [];
         const nodesMap = new Map();

         rawFileData.forEach((row, rowIndex) => {
             const sourceVal = row[sourceIndex] !== null && row[sourceIndex] !== undefined ? String(row[sourceIndex]).trim() : '';
             const targetVal = row[targetIndex] !== null && row[targetIndex] !== undefined ? String(row[targetIndex]).trim() : '';
             const valueRaw = row[valueIndex] !== null && row[valueIndex] !== undefined ? String(row[valueIndex]).trim().replace(',', '.') : '';
             const valueVal = parseFloat(valueRaw);

             if (!sourceVal || !targetVal || isNaN(valueVal) || valueVal <= 0) {
                 return;
             }

             // Pridať uzly do mapy. Objekt uzla bude obsahovať meno a neskôr možno farbu
             if (!nodesMap.has(sourceVal)) {
                 nodesMap.set(sourceVal, { name: sourceVal });
             }
             if (!nodesMap.has(targetVal)) {
                 nodesMap.set(targetVal, { name: targetVal });
             }

             links.push({
                 sourceName: sourceVal,
                 targetName: targetVal,
                 value: valueVal
             });
         });

          if (nodesMap.size === 0 || links.length === 0) {
              console.log("Žiadne platné dáta pre vytvorenie Sankey grafu po filtrovaní.");
              sankeyGraphContainer.innerHTML = '';
              return;
         }

         const nodes = Array.from(nodesMap.values());

         // Ak je režim farbenia "bySourceNode" alebo "colorNodesBySource" je zapnutý,
         // vytvoríme farebnú škálu pre uzly a priradíme farby uzlom.
         if (graphSettings.linkColorMode === 'bySourceNode' || graphSettings.colorNodesBySource) {
              // Vytvoríme ordinálnu škálu, ktorá priradí unikátnu farbu každému unikátnemu názvu uzla
              // Použijeme d3.schemeCategory10 ako sadu farieb (má 10 farieb)
              // Ak chcete viac farieb, môžete použiť d3.schemeCategory20, d3.schemeTableau10 atď.
              const distinctNodeNames = Array.from(new Set([...links.map(l => l.sourceName), ...links.map(l => l.targetName)]));

              // Použijeme len uzly, ktoré sa reálne vyskytujú v linkoch, pre doménu škály
               const nodesInLinks = new Set(links.map(l => l.sourceName).concat(links.map(l => l.targetName)));
               const domainNames = Array.from(nodesInLinks);

              // Skontrolujeme, či máme dostatok farieb v schéme pre počet unikátnych uzlov
               const colorScheme = d3.schemeCategory10; // Alebo iná schéma
               if (domainNames.length > colorScheme.length) {
                   console.warn(`Počet unikátnych uzlov (${domainNames.length}) prekračuje počet farieb v schéme (${colorScheme.length}). Niektoré uzly budú mať rovnakú farbu.`);
               }


              nodeColorScale = d3.scaleOrdinal(colorScheme)
                                 .domain(domainNames); // Doména sú názvy uzlov, ktoré sa vyskytujú v linkoch

              // Priradíme farbu každému uzlu v hlavnom 'nodes' poli
              nodes.forEach(node => {
                  // Priradiť farbu len uzlom, ktoré sú v doméne (t.j. vyskytujú sa v linkoch)
                   if (domainNames.includes(node.name)) {
                       node.color = nodeColorScale(node.name);
                   } else {
                       // Uzly, ktoré nie sú v linkoch (ak by nejaké také vznikli), nebudú mať priradenú farbu škálou
                       node.color = graphSettings.nodeColor; // Fallback na jednotnú farbu uzla
                   }
              });

         } else {
             // Ak sa nefarbí podľa zdroja, škálu vynulujeme a z uzlov odstránime pridanú farbu
             nodeColorScale = null;
              nodes.forEach(node => {
                  delete node.color; // Odstrániť pridanú vlastnosť .color
              });
         }


         links.forEach(link => {
              const sourceNodeIndex = nodes.findIndex(node => node.name === link.sourceName);
              const targetNodeIndex = nodes.findIndex(node => node.name === link.targetName);

              if (sourceNodeIndex === -1 || targetNodeIndex === -1) {
                  link.source = -1;
                   link.target = -1;
              } else {
                 link.source = nodes[sourceNodeIndex]; // V Sankey layoutu by link.source/target mali byť odkazy na uzly, nie indexy
                 link.target = nodes[targetNodeIndex];
              }
         });

        // Filter pre istotu ešte raz, ak by sa dostali neplatné linky (s -1 indexom source/target mena pred mapovaním)
        // Hoci po mapovaní na objekty už -1 indexy nebudú
         const validLinks = links.filter(link => typeof link.source === 'object' && typeof link.target === 'object');

         const sankeyData = { nodes: nodes, links: validLinks };

         // console.log("Pripravené dáta pre Sankey:", JSON.parse(JSON.stringify(sankeyData)));

         updateGraph(sankeyData);
    }


    function updateGraph(sankeyData) {
        if (typeof d3 === 'undefined' || typeof d3.sankey === 'undefined') {
            console.error("Knihovna D3.js nebo její Sankey modul není načten.");
            sankeyGraphContainer.innerHTML = "Chyba pri načítaní knižnice D3.js Sankey.";
            return;
        }

        if (!sankeyData || !sankeyData.nodes || !sankeyData.links || sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
             console.log("Dáta pre graf nie sú k dispozícii alebo sú prázdne po príprave.");
             sankeyGraphContainer.innerHTML = '';
             return;
        }

        console.log("Vykresľujem/aktualizujem graf s nastaveniami:", graphSettings); // Log aktuálnych nastavení

        // --- Získať aktuálne nastavenia z objektu graphSettings ---
        const { width, height, nodeWidth, nodePadding, linkColorMode, solidLinkColor, linkOpacity, nodeColor, showNodeLabels, showNodeValues, colorNodesBySource } = graphSettings;


        // Vyčistiť predchádzajúci graf
        sankeyGraphContainer.innerHTML = '';

        const svg = d3.select("#sankeyGraphContainer")
                      .append("svg")
                      .attr("width", width)
                      .attr("height", height);

        const sankey = d3.sankey()
                         .nodeWidth(nodeWidth)
                         .nodePadding(nodePadding)
                         .extent([[1, 1], [width - 1, height - 5]]);

        // Spustiť layout - modifikuje sankeyData.nodes a sankeyData.links
        sankey(sankeyData);

        // --- Vykreslenie Linkov ---
        const link = svg.append("g")
                        .attr("class", "links")
                        .attr("fill", "none")
                        .attr("stroke-opacity", linkOpacity) // Opacita z nastavení
                      .selectAll("path")
                      .data(sankeyData.links) // Použiť dáta z modifikovaného objektu po layoutu
                      .join("path")
                         .attr("d", d3.sankeyLinkHorizontal())
                         .attr("stroke-width", d => Math.max(0.5, d.width))
                         .sort((a, b) => b.width - a.width);

        // Nastaviť farbu linky na základe režimu farbenia
        if (linkColorMode === 'solid') {
            link.attr("stroke", solidLinkColor); // Jednotná farba z nastavení
            console.log("Link Color Mode: Solid, Color:", solidLinkColor);
        } else if (linkColorMode === 'bySourceNode') {
            // Farba linky podľa farby zdrojového uzla (priradená v prepareSankeyDataAndDraw)
             link.attr("stroke", d => {
                  const color = d.source.color || solidLinkColor; // Použiť priradenú farbu uzla, fallback na jednotnú
                  // console.log(`Link from ${d.source.name} to ${d.target.name} color: ${color}`);
                  return color;
             });
             console.log("Link Color Mode: By Source Node, using node colors.");
        }
        // TODO: Pridať ďalšie režimy farbenia liniek


        // --- Vykreslenie Uzlov ---
        const node = svg.append("g")
                         .attr("class", "nodes")
                       .selectAll("rect")
                       .data(sankeyData.nodes) // Použiť dáta z modifikovaného objektu po layoutu
                       .join("rect")
                          .attr("x", d => d.x0)
                          .attr("y", d => d.y0)
                          .attr("height", d => d.y1 - d.y0)
                          .attr("width", d => d.x1 - d.x0)
                          .attr("stroke", "#000"); // Pridať čierny okraj uzlom

        // Nastaviť farbu uzla na základe nastavení
        if (colorNodesBySource && linkColorMode === 'bySourceNode') {
             // Ak chceme farbiť uzly podľa farby zdroja liniek (a režim liniek je podľa zdroja)
             // Použiť priradenú farbu uzla, fallback na jednotnú farbu uzla
            node.attr("fill", d => d.color || nodeColor);
             console.log("Node Color Mode: By Source Link Color");
        } else {
            // Inak použiť jednotnú farbu uzla z nastavení
            node.attr("fill", nodeColor);
             console.log("Node Color Mode: Solid, Color:", nodeColor);
        }

        // TODO: Pridať drag-and-drop na uzly (implementujeme v ďalšom kroku, ak chcete)


         // --- Pridanie Textových Popisov k Uzlom ---
         const labelsGroup = svg.append("g")
                            .attr("class", "labels")
                            .style("display", showNodeLabels ? "block" : "none"); // Zobraziť/skryť podľa nastavenia

         const labels = labelsGroup
                           .attr("font-family", "sans-serif")
                           .attr("font-size", 10)
                         .selectAll("text")
                         .data(sankeyData.nodes) // Použiť dáta z modifikovaného objektu po layoutu
                         .join("text")
                           .attr("x", d => d.x0 < width / 2 ? d.x1 + nodeWidth + 6 : d.x0 - 6) // Posun textu ďalej od uzla
                           .attr("y", d => (d.y1 + d.y0) / 2)
                           .attr("dy", "0.35em")
                           .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end");

         labels.text(d => {
             let text = d.name;
             if (showNodeValues && d.value !== undefined) {
                 const formattedValue = Number.isInteger(d.value) ? d.value : d3.format(".1f")(d.value);
                 text += ` (${formattedValue})`;
             }
             return text;
         });

          // TODO: Pridať tooltipy k uzlom
    }

    // --- Funkcia na inicializáciu UI nastavení s aktuálnymi hodnotami ---
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


        // Inicializovať viditeľnosť inputu pre jednotnú farbu linky a stav inputu jednotnej farby uzla
         updateLinkColorUI();

        // TODO: Inicializovať ďalšie nastavenia, ak by boli pridané
    }


    // --- Handler pre zmenu akéhokoľvek nastavenia ---
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

        console.log("Nastavenia zmenené:", graphSettings); // Log zmeny nastavení

         // Aktualizovať zobrazenie UI pre farbu linky
         updateLinkColorUI();

         // Prekresliť graf s novými nastaveniami
         if (sourceColumnSelect.value !== "" && targetColumnSelect.value !== "" && valueColumnSelect.value !== "") {
             console.log("Zmena nastavení, prekresľujem graf.");
             // Zavoláme prepareSankeyDataAndDraw, ktorá znovu prepočíta Sankey layout s novými rozmermi/paddingom
             // a znova priradí farby uzlom, ak je to potrebné.
             prepareSankeyDataAndDraw();
         }
    }

     // Funkcia na zobrazenie/skrytie inputu pre jednotnú farbu linky a stav inputu jednotnej farby uzla
     function updateLinkColorUI() {
          if (graphSettings.linkColorMode === 'solid') {
              solidLinkColorDiv.style.display = 'block';
          } else {
              solidLinkColorDiv.style.display = 'none';
          }

          // Zablokovať/odblokovať input jednotnej farby uzla
          if (graphSettings.colorNodesBySource && graphSettings.linkColorMode === 'bySourceNode') {
               nodeColorInput.disabled = true;
               // Voliteľne nastaviť farbu inputu na šedú alebo inú vizuálnu indikáciu
               nodeColorInput.style.opacity = 0.5;
          } else {
               nodeColorInput.disabled = false;
               nodeColorInput.style.opacity = 1;
          }
     }


    // --- Funkcie pre export ---

    function exportSVG() {
        const svgElement = sankeyGraphContainer.querySelector('svg');
        if (!svgElement) {
            console.error("SVG graf nebol nájdený.");
            // uploadStatus.textContent = "Chyba: SVG graf na export nebol nájdený.";
            // uploadStatus.style.color = 'red';
            return;
        }

        // Získať vonkajší HTML kód SVG elementu
        const svgString = new XMLSerializer().serializeToString(svgElement);

        // Vytvoriť Blob s MIME typom pre SVG
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

        // Použiť FileSaver.js na uloženie súboru
        // Kontrola, či je FileSaver dostupný
        if (typeof saveAs !== 'undefined') {
            saveAs(blob, 'sankey_graph.svg');
            console.log("SVG graf exportovaný.");
        } else {
            console.error("FileSaver.js nie je načítaný. Export nie je možný.");
            // uploadStatus.textContent = "Chyba: FileSaver.js nie je načítaný. Export nie je možný.";
            // uploadStatus.style.color = 'red';
             // Alternatívne: Manuálne stiahnutie pomocou a tagu
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = 'sankey_graph.svg';
             link.click();
             URL.revokeObjectURL(link.href); // Uvoľniť URL objekt
        }
    }

    // Pomocná funkcia na export do PNG/JPG cez Canvas
    function exportCanvas(format = 'png') {
        const svgElement = sankeyGraphContainer.querySelector('svg');
         if (!svgElement) {
            console.error("SVG graf nebol nájdený pre export do Canvas.");
            // uploadStatus.textContent = "Chyba: SVG graf na export nebol nájdený.";
            // uploadStatus.style.color = 'red';
            return;
        }

         // Kontrola, či je FileSaver dostupný
         if (typeof saveAs === 'undefined') {
             console.error("FileSaver.js nie je načítaný. Export nie je možný.");
             // uploadStatus.textContent = "Chyba: FileSaver.js nie je načítaný. Export nie je možný.";
             // uploadStatus.style.color = 'red';
             return;
         }


        // Získať rozmery grafu z nastavení alebo SVG elementu
        const width = parseInt(svgElement.getAttribute('width')) || graphSettings.width;
        const height = parseInt(svgElement.getAttribute('height')) || graphSettings.height;


        // Konvertovať SVG na XML string (s potenciálnym inlinovaním štýlov, ak je to potrebné)
        // Základná serializácia
        let svgString = new XMLSerializer().serializeToString(svgElement);

        // Vytvoriť data URL zo SVG stringu
        const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));


        // Vytvoriť dočasný Image objekt
        const img = new Image();

        img.onload = function() {
            // Keď sa SVG načíta ako obrázok, nakresliť ho na Canvas

            // Vytvoriť dočasný Canvas element
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');

            // Vyplniť pozadie (najmä pre JPG, ktorý nepodporuje transparentnosť)
            // Pre JPG chceme biele pozadie
            if (format === 'jpeg') {
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, width, height);
            } else {
                 // Pre PNG s transparentnosťou nemusíme vyplňovať
                 // Alebo môžeme vyplniť transparentnou farbou
                 context.clearRect(0, 0, width, height);
            }


            // Nakresliť obrázok (SVG) na Canvas
            context.drawImage(img, 0, 0, width, height); // Nakresliť s určenými rozmermi


            // Konvertovať Canvas na Blob v požadovanom formáte
            canvas.toBlob(function(blob) {
                // Použiť FileSaver.js na uloženie Blobu
                const fileName = `sankey_graph.${format}`;
                saveAs(blob, fileName);
                 console.log(`${format.toUpperCase()} graf exportovaný.`);

                 // Optional: odstrániť dočasný Canvas element z DOM, ak bol pridaný
                 // canvas.remove();

            }, `image/${format}`, 0.95); // MIME typ a kvalita pre JPG (0-1)

        };

        img.onerror = function(error) {
            console.error(`Chyba pri načítaní SVG pre export do ${format.toUpperCase()}:`, error);
             // uploadStatus.textContent = `Chyba pri exporte do ${format.toUpperCase()}.`;
             // uploadStatus.style.color = 'red';
        };


        // Spustiť načítanie obrázka (SVG data URL)
        img.src = svgDataUrl;

        // Optional: Pridať loading indikátor počas konverzie (môže chvíľu trvať pri zložitých grafoch)

    }

    // --- Pomocné funkcie ---
    function resetApplicationState() {
        dataSection.style.display = 'none';
        settingsSection.style.display = 'none';
        graphSection.style.display = 'none';
        exportSection.style.display = 'none';

        dataTable.querySelector('thead').innerHTML = '';
        dataTable.querySelector('tbody').innerHTML = '';

        sourceColumnSelect.removeEventListener('change', handleColumnMappingChange);
        targetColumnSelect.removeEventListener('change', handleColumnMappingChange);
        valueColumnSelect.removeEventListener('change', handleColumnMappingChange);

        sourceColumnSelect.innerHTML = '';
        targetColumnSelect.innerHTML = '';
        valueColumnSelect.innerHTML = '';

        sankeyGraphContainer.innerHTML = '';

        rawFileData = null;
        columnHeaders = [];
        uploadStatus.textContent = '';
        nodeColorScale = null; // Vynulovať farebnú škálu

         // Resetovať nastavenia UI na defaultné hodnoty
         Object.assign(graphSettings, {
             width: 960,
             height: 600,
             nodeWidth: 15,
             nodePadding: 10,
             nodeColor: '#4682B4',
             linkColorMode: 'solid',
             solidLinkColor: '#000000',
             linkOpacity: 0.5,
             showNodeLabels: true,
             showNodeValues: false,
             colorNodesBySource: false
         });
         initializeSettingsUI(); // Aktualizuje UI s týmito defaultnými hodnotami
    }

    // Inicializácia - uistite sa, že sekcie sú pri štarte skryté
     resetApplicationState();

});