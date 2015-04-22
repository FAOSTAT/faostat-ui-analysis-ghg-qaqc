define(['jquery',
        'handlebars',
        'text!faostat_ui_analysis_ghg_qa_qc/html/templates.html',
        'i18n!faostat_ui_analysis_ghg_qa_qc/nls/translate',
        'FAOSTAT_UI_COMMONS',
        'bootstrap',
        'sweetAlert'], function ($, Handlebars, templates, translate, Commons) {

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

        /* Clear the placeholder. */
        //$('#' + this.CONFIG.placeholder_id).empty();
        //$('#' + this.CONFIG.placeholder_id).html('FAOSTAT UI ANALYSIS GHG QA/QC');

        var _this = this;
        Commons.wdsclient('groupsanddomains', this.CONFIG, function(json) {
            $('#' + _this.CONFIG.placeholder_id).empty().html(json);
        });

    };

    return GHG_QA_QC;

});