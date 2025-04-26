# Sankey Graph Generator

A simple, standalone, client-side web application for generating interactive Sankey diagrams from user-provided CSV or XLSX data. All data processing and graph generation happen directly in your browser, ensuring privacy and no server-side data handling.

## Features

* **File Input:** Easily upload local data files in CSV (.csv) or XLSX (.xlsx) formats.
* **Client-Side Processing:** Files are read and parsed directly in the browser using the `FileReader` API and SheetJS library. No data is ever sent to a server.
* **Data Preview and Editing:** View the uploaded data in an interactive HTML table and edit values directly within the browser. Changes dynamically update the graph.
* **Column Mapping:** Select which columns from your data represent the Source, Target, and Value for the Sankey diagram via a user-friendly interface. Includes automatic column name detection for common terms (e.g., "Source", "Target", "Value").
* **Interactive Sankey Visualization:** Generate a dynamic and interactive Sankey diagram using the powerful D3.js library.
* **Graph Customization:** Adjust various aspects of the graph, including dimensions, node width, padding, node colors (single color or by source link color), link colors (single color or by source node), link opacity, and label visibility/format.
* **Node Dragging:** Interactively drag nodes vertically on the graph to adjust their positions (implemented using D3-Drag).
* **Client-Side Export:** Export the generated and customized graph to SVG, PNG, or JPG image formats, processed entirely within the browser.
* **Privacy Focused:** Your data remains in your browser's memory and is not stored or transmitted to any server.

## How to Use

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AdaptToAIera/Sankey_App.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd sankey-generator
    ```
3.  **Download Libraries:** This project relies on external JavaScript libraries. You need to download their minified versions and place them in the `libs/` directory.
    * SheetJS (`xlsx.full.min.js`): [https://unpkg.com/sheetjs/dist/xlsx.full.min.js](https://unpkg.com/sheetjs/dist/xlsx.full.min.js)
    * D3.js (Full build, includes Sankey and Drag modules, e.g., v7): [https://d3js.org/d3.v7.min.js](https://d3js.org/d3.v7.min.js)
        *(Alternatively, if using modular D3 files:* `d3.min.js`, `d3-sankey.min.js`, `d3-drag.min.js` must all be downloaded and included in `index.html` in the correct order after `d3.min.js`)*
    * FileSaver.js (`FileSaver.min.js`): [https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js](https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js)
    Place these downloaded files into the `sankey-generator/libs/` folder. Make sure the script tags in `index.html` match the file names. Uncomment the FileSaver.js script tag in `index.html`.
4.  **Open the `index.html` file:** Open the `index.html` file directly in a modern web browser (like Chrome, Firefox, Edge).
5.  **Upload Data:** Use the "Nahrať Dáta" (Upload Data) section to select your CSV or XLSX file.
6.  **Map Columns:** Once the data is loaded, use the dropdown menus to select the Source, Target, and Value columns. The graph will render automatically if columns are selected or auto-detected.
7.  **Edit Data:** Optionally edit values directly in the data table. Changes will update the graph.
8.  **Customize Graph:** Use the "Nastavenia Grafu" (Graph Settings) panel to change dimensions, colors, and other visual properties.
9.  **Export Graph:** Use the "Export Grafu" (Export Graph) buttons to download the graph in SVG, PNG, or JPG format.

## Technologies Used

* HTML5
* CSS3
* JavaScript (ES6+)
* [SheetJS](https://sheetjs.com/) (for reading and parsing CSV/XLSX files)
* [D3.js](https://d3js.org/) (specifically `d3-selection`, `d3-scale`, `d3-sankey`, `d3-drag` modules for graph generation and interaction)
* [FileSaver.js](https://github.com/eligrey/FileSaver.js/) (for client-side file saving)

## Privacy

This application is designed with privacy in mind. All file reading, data processing, graph generation, editing, and export operations are performed *locally* within your web browser's memory. Your data is **never** uploaded to a server or stored persistently (except when you explicitly export a file). Closing the browser window will clear all loaded data.

## File Structure

* sankey-generator/
    * index.html - Main application HTML file
    * style.css - Stylesheet for the application
    * script.js - Main JavaScript logic
    * libs/ - Directory for external libraries
        * xlsx.full.min.js
        * d3.min.js (or d3.vX.min.js and potentially d3-sankey.min.js, d3-drag.min.js)
        * FileSaver.min.js

## Future Enhancements

* More sophisticated data validation and error handling.
* Advanced customization options (e.g., coloring nodes/links by another categorical column, custom color schemes, sorting nodes within columns).
* Tooltips on hover for nodes and links to display detailed information.
* Improved performance for very large datasets.
* Ability to add/remove rows or columns in the data table.
* Persisting graph settings locally (e.g., using `localStorage`).

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the LICENSE file for details.

## Vibe coding tools:

This project was created with help of Gemini 2.5 Flash from Google