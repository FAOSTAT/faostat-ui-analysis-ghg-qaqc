define(function() {

    var config = {
        paths: {
            FAOSTAT_UI_ANALYSIS_GHG_QA_QC: 'faostat-ui-analysis-ghg-qaqc',
            faostat_ui_analysis_ghg_qa_qc: '../',
            FAOSTAT_UI_ANALYSIS_GHG_QAQC_PDF: '../pdf/'
        },
        shim: {
            bootstrap: {
                deps: ['jquery']
            }
        }
    };

    return config;

});