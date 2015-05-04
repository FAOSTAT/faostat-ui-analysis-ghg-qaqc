define(['jquery',
        'handlebars',
        'text!faostat_ui_analysis_ghg_qa_qc/html/templates.html',
        'i18n!faostat_ui_analysis_ghg_qa_qc/nls/translate',
        'FAOSTAT_UI_COMMONS',
        'FAOSTAT_UI_WIDE_TABLES',
        'chosen',
        'bootstrap',
        'sweetAlert'], function ($, Handlebars, templates, translate, Commons, WIDE_TABLES, chosen) {

    'use strict';

    function GHG_QA_QC() {

        this.CONFIG = {
            lang: 'en',
            lang_faostat: 'E',
            datasource: 'faostatdb',
            placeholder_id: 'faostat_ui_analysis_ghg_qaqc_placeholder'
        };

    }

    GHG_QA_QC.prototype.init = function(config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Fix the language, if needed. */
        this.CONFIG.lang = this.CONFIG.lang != null ? this.CONFIG.lang : 'en';

        /* Store FAOSTAT language. */
        this.CONFIG.lang_faostat = Commons.iso2faostat(this.CONFIG.lang);

        /* This... */
        var _this = this;

        /* Initiate ChosenJS. */
        $('.chosen-select').chosen();

        /* Test WDS Tables. */
        var sql =   "SELECT * " +
                    "FROM UNFCCC_GAS " +
                    "WHERE areacode = '10' " +
                    "AND Year >= 1990 AND Year <= 2012 " +
                    "AND tabletype = 'emissions' " +
                    "ORDER BY UNFCCCCode, Year DESC";
        Commons.wdstable(sql, function(json) {

            /* Initiate wide tables library. */
            var wt_1 = new WIDE_TABLES();

            /* Initiate the library. */
            wt_1.init({
                lang: _this.CONFIG.lang,
                data: json,
                placeholder_id: _this.CONFIG.placeholder_id,
                show_row_code: true,
                row_code: 'UNFCCCCode',
                row_label: 'GUNFItemNameE',
                cols_dimension: 'Year',
                value_dimension: 'GUNFValue'
            });

        }, 'http://localhost:8080/wds/rest');

    };

    return GHG_QA_QC;

});