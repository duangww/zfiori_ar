/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zfiori_ar/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
