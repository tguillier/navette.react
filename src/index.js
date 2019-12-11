import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class BarcodeReader extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            readers: null, 
            barcodeReader: null, 
            readerAutoClosed: false,
            hidden: null, 
            visibilityChange: null,
            availableReaders: null,
            openButton: document.getElementById("openButton"),
            closeButton: document.getElementById("closeButton"),
            activateButton: document.getElementById("activateButton"),
            deactivateButton: document.getElementById("deactivateButton"),
            addEventListenerButton: document.getElementById("addEventListenerButton"),
            enableTriggerButton: document.getElementById("enableTriggerButton"),
            clearLogButton: document.getElementById("clearLogButton"),
            logMessage: "",
            barcodeDataText: document.getElementById("BarcodeData"),
            symbTypeText: document.getElementById("SymbType"),
            readTimeText: document.getElementById("ReadTime")
        }
    }

    componentDidMount() {
        this.setup();
    }

    setup() {
        let readers = new window.BarcodeReaders((result) => this.onBarcodeReadersComplete(result));
        this.setState({ readers: readers });

        // Check whether the browser supports detection of the web page visibility.
        if (typeof document.webkitHidden !== "undefined") { // Android 4.4 Chrome
            this.setState({
                hidden: "webkitHidden",
                visibilityChange: "webkitvisibilitychange"
            });
        }
        else if (typeof document.hidden !== "undefined") { // Standard HTML5 attribute
            this.setState({
                hidden: "hidden",
                visibilityChange: "visibilitychange"
            });
        }

        if (this.state.hidden && typeof document.addEventListener !== "undefined" &&
            typeof document[this.state.hidden] !== "undefined") {
            // Add an event listener for the visibility change of the web page.
            document.addEventListener(this.state.visibilityChange, this.handleVisibilityChange, false);
        }
    }

    onBarcodeReadersComplete(result) {
        if (result.status === 0) {
            this.state.readers.getAvailableBarcodeReaders((result) => this.onGetAvailableBarcodeReadersComplete(result));
        }
        else {
            this.setState({
                logMessage: "<p style=\"color:red\">Failed to create BarcodeReaders, status: " + result.status + ", message: " + result.message + "</p>"
            })
        }
    }

    // After BarcodeReader object is created we can configure our symbologies and add our event listener
    onBarcodeReaderComplete(result) {
        if (result.status === 0) {
            // BarcodeReader object was successfully created
            this.setState({
                logMessage: "BarcodeReader object successfully created"
            })
            
            this.updateUI(true, true);

            // Configure the symbologies needed. Buffer the settings and commit them at once.
            this.state.barcodeReader.setBuffered("Symbology", "Code39", "Enable", "true", this.onSetBufferedComplete);
            this.state.barcodeReader.setBuffered("Symbology", "Code128", "EnableCode128", "true", this.onSetBufferedComplete);
            this.state.barcodeReader.setBuffered("Symbology", "EANUPC", "EnableEAN13", "true", this.onSetBufferedComplete);
            this.state.barcodeReader.setBuffered("Symbology", "QRCode", "Enable", "true", this.onSetBufferedComplete);

            this.state.barcodeReader.commitBuffer(this.onCommitComplete);

            // Add an event handler to receive barcode data
            this.addRemoveBarcodeListener(true);
            // Add an event handler for the window's beforeunload event
            window.addEventListener("beforeunload", this.onBeforeUnload);
        }
        else {
            this.setState({
                barcodeReader: null,
                logMessage: this.state.logMessage + 
                    "<p style=\"color:red\">Failed to create BarcodeReader, status: " + result.status + ", message: " + result.message + "</p>"
            })
            
            alert('Failed to create BarcodeReader, ' + result.message);
        }
    }

    // Verify the symbology configuration
    onSetBufferedComplete(result) {
        if (result.status !== 0) {
            this.setState({
                logMessage: this.state.logMessage +
                    "<p style=\"color:red\">setBuffered failed, status: " + result.status + ", message: " + result.message + "</p>" +
                    "<p>Family=" + result.family + " Key=" + result.key + " Option=" + result.option + "</p>"
            })
        }
    }

    onCommitComplete(resultArray) {
        if (resultArray.length > 0) {
            for (var i = 0; i < resultArray.length; i++) {
                var result = resultArray[i];
                if (result.status !== 0) {
                    this.setState({
                        logMessage: this.state.logMessage +
                            "<p style=\"color:red\">commitBuffer failed, status: " + result.status + ", message: " + result.message + "</p>"
                    })
                    
                    if (result.method === "getBuffered" || result.method === "setBuffered") {
                        this.setState({
                            logMessage: this.state.logMessage +
                                "<p>Method=" + result.method +
                                " Family=" + result.family + " Key=" + result.key +
                                " Option=" + result.option + "</p>"
                        })
                    }
                }
            } //endfor
        }
    }

    // Handle barcode data when available
    onBarcodeDataReady(data, type, time) {
        this.setState({
            barcodeDataText: Object.assign({}, this.state.barcodeDataText, {value: data}),
            symbTypeText: Object.assign({}, this.state.symbTypeText, {value: type}),
            readTimeText: Object.assign({}, this.state.readTimeText, {value: time})
        })
    }

    updateUI(readerOpened, clearData) {
        this.setState({
            openButton: Object.assign({}, this.state.openButton, {disabled: readerOpened}),
            closeButton: Object.assign({}, this.state.closeButton, {disabled: !readerOpened}),
            activateButton: Object.assign({}, this.state.activateButton, {disabled: !readerOpened}),
            deactivateButton: Object.assign({}, this.state.deactivateButton, {disabled: !readerOpened}),
            addEventListenerButton: Object.assign({}, this.state.addEventListenerButton, {disabled: !readerOpened}),
            enableTriggerButton: Object.assign({}, this.state.enableTriggerButton, {disabled: !readerOpened})
        })

        if (clearData) {
            this.setState({
                barcodeDataText: Object.assign({}, this.state.barcodeDataText, {value: ""}),
                symbTypeText: Object.assign({}, this.state.symbTypeText, {value: ""}),
                readTimeText: Object.assign({}, this.state.readTimeText, {value: ""})
            })
        }
    }

    /**
     * If the browser supports visibility change event, we can close the
     * BarcodeReader object when the web page is hidden and create a new
     * instance of the BarcodeReader object when the page is visible. This
     * logic is used to re-claim the barcode reader in case another
     * application has claimed it when this page becomes hidden.
     */
    handleVisibilityChange() {
        if (document[this.state.hidden]) // The web page is hidden
        {
            this.closeBarcodeReader(true);
        }
        else // The web page is visible
        {
            if (this.state.readerAutoClosed) {
                // Note: If you switch to another tab and quickly switch back
                // to the current tab, the following call may have no effect
                // because the BarcodeReader may not be completely closed yet.
                // Once the BarcodeReader is closed, you may use the Open Reader
                // button to create a new BarcodeReader object.
                this.openBarcodeReader();
            }
        }
    }

    openBarcodeReader(scannerName) {
        if (!this.state.barcodeReader) {
            this.setState({
                barcodeReader: new BarcodeReader(scannerName, (result) => this.onBarcodeReaderComplete(result))
            })
        }
    }

    closeBarcodeReader(isAutoClose) {
        if (this.state.barcodeReader) {
            this.setState({ readerAutoClosed: isAutoClose });
            this.state.barcodeReader.close(function (result) {
                if (result.status === 0) {
                    this.setState({
                        barcodeReader: null,
                        logMessage: this.state.logMessage +
                            "<p style=\"color:blue\">BarcodeReader successfully closed.</p>"
                    })
                    
                    this.updateUI(false, false);
                    window.removeEventListener("beforeunload");
                }
                else {
                    this.setState({
                        logMessage: this.state.logMessage +
                            "<p style=\"color:red\">Failed to close BarcodeReader, status: " + result.status + ", message: " + result.message + "</p>"
                    })
                }
            });
        }
    }

    openButtonClicked() {
        var scannerName = this.state.readerSelect.options[this.state.readerSelect.selectedIndex].value;
        if (scannerName !== "None") {
            this.openBarcodeReader(scannerName);
        }
        else {
            this.openBarcodeReader(null);
        }
    }

    closeButtonClicked() {
        this.closeBarcodeReader(false);
    }

    activateButtonClicked() {
        this.activateBarcodeReader();
    }

    deactivateButtonClicked() {
        this.deactivateBarcodeReader();
    }

    addEventListenerButtonClicked() {
        var isAdd = this.state.addEventListenerButton.value === "Remove Listener" ? false : true;
        this.addRemoveBarcodeListener(isAdd);
    }

    enableTriggerButtonClicked() {
        var enabled = this.state.enableTriggerButton.value === "Disable Trigger" ? false : true;
        this.enableTrigger(enabled);
    }

    clearLogButtonClicked() {
        this.setState({
            logMessage: ""
        })
    }

    activateBarcodeReader() {
        this.setState({
            barcodeDataText: Object.assign({}, this.state.barcodeDataText, {value: ""}),
            symbTypeText: Object.assign({}, this.state.symbTypeText, {value: ""}),
            readTimeText: Object.assign({}, this.state.readTimeText, {value: ""})
        })

        // The following call should cause the aimer to light up
        // and be ready to decode. This feature is often referred
        // to as starting the software trigger.
        this.state.barcodeReader.activate(true, this.onActivateComplete);
    }

    deactivateBarcodeReader() {
        // The following call should deactivate the aimer. This is
        // often referred to as stopping the software trigger.
        this.state.barcodeReader.activate(false, this.onDeactivateComplete);
    }

    addRemoveBarcodeListener(added) {
        if (added) {
            // Add an event handler for the barcodedataready event
            this.state.barcodeReader.addEventListener("barcodedataready", this.onBarcodeDataReady, false);

            this.setState({
                addEventListenerButton: Object.assign({}, this.state.addEventListenerButton, {value: "Remove Listener"}),
                logMessage: this.state.logMessage +
                    "<br>Added an event handler for the barcodedataready event."
            })
        }
        else {
            // Remove an event handler for the barcodedataready event
            this.state.barcodeReader.removeEventListener("barcodedataready", this.onBarcodeDataReady);
            
            this.setState({
                addEventListenerButton: Object.assign({}, this.state.addEventListenerButton, {value: "Add Listener"}),
                logMessage: this.state.logMessage +
                    "<br>Removed the event handler for the barcodedataready event."
            })
        }
    }

    // Enables or disables the hardware trigger (scan) button. The user
    // will not be able to press the scan button to scan if it is disabled.
    enableTrigger(enabled) {
        this.state.barcodeReader.enableTrigger(enabled, this.onEnableTriggerComplete);
    }

    onGetAvailableBarcodeReadersComplete(result) {
        if (result.length !== 0) {
            var selectOptions;
            for (var i = 0; i < result.length; i++) {
                selectOptions += "<option value=\"" + result[i] + "\">" + result[i] + "</option>";
            }
            this.setState({availableReaders: selectOptions});
        }
    }

    onActivateComplete(result) {
        if (result.status !== 0) {
            this.setState({
                logMessage: this.state.logMessage +
                    "<p style=\"color:red\">BarcodeReader activate failed, status: " + result.status + ", message: " + result.message + "</p>"
            })
        }
    }

    onDeactivateComplete(result) {
        if (result.status !== 0) {
            this.setState({
                logMessage: this.state.logMessage +
                    "<p style=\"color:red\">BarcodeReader deactivate failed, status: " + result.status + ", message: " + result.message + "</p>"
            })
        }
    }

    onEnableTriggerComplete(result) {
        if (result.status !== 0) {
            this.setState({
                logMessage: this.state.logMessage +
                    "<p style=\"color:red\">BarcodeReader enableTrigger failed, status: " + result.status + ", message: " + result.message + "</p>"
            })
        }
        else {
            this.setState({
                enableTriggerButton: Object.assign(
                    {}, 
                    this.state.enableTriggerButton, 
                    {
                        value: this.state.enableTriggerButton.value === "Disable Trigger" ? "Enable Trigger" : "Disable Trigger"
                    })
            });
        }
    }

    onBeforeUnload(e) {
        var message = "Please close BarcodeReader before leaving this page.";
        (e || window.event).returnValue = message;
        return message;
    }

    render() {
        return (
            <div className="barcode-reader">
                <h3>BarcodeReader API Demo</h3>

                <label htmlFor="readerSelect">Readers:</label>
                <select id="readerSelect">
                    <option value="None">Select a reader</option>
                    {this.state.availableReaders}
                </select>
                <br />

                <input type="button" value="Open Reader" id="openButton" onClick={this.openButtonClicked} />
                <input type="button" value="Close Reader" id="closeButton" onClick={this.closeButtonClicked} disabled /><br />

                <input type="button" value="Activate Reader" id="activateButton" onClick={this.activateButtonClicked} disabled />
                <input type="button" value="Deactivate Reader" id="deactivateButton" onClick={this.deactivateButtonClicked} disabled />
                <input type="button" value="Remove Listener" id="addEventListenerButton" onClick={this.addEventListenerButtonClicked} disabled />
                <input type="button" value="Disable Trigger" id="enableTriggerButton" onClick={this.enableTriggerButtonClicked} disabled />
                <input type="button" value="Clear log" id="clearLogButton" onClick={this.clearLogButtonClicked} />

                <div>
                    <b>Barcode Data Read</b><br />
                    <label htmlFor="BarcodeData">Data:</label>
                    <input type="text" id="BarcodeData" size="20" /><br />

                    <label htmlFor="SymbType">Symbology:</label>
                    <input type="text" id="SymbType" size="16" /><br />

                    <label htmlFor="ReadTime">Time:</label>
                    <input type="text" id="ReadTime" size="24" /><br />
                </div>

                <div><b>Log:</b></div>
                <div id="logMsg">{this.state.logMessage}</div>
            </div>
        );
    }
}

// ========================================

ReactDOM.render(
    <BarcodeReader />,
    document.getElementById('root')
);
