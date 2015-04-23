define(['jquery',
        'handlebars',
        'text!faostat_ui_analysis_ghg_qa_qc/html/templates.html',
        'i18n!faostat_ui_analysis_ghg_qa_qc/nls/translate',
        'FAOSTAT_UI_COMMONS',
        'chosen',
        'bootstrap',
        'sweetAlert'], function ($, Handlebars, templates, translate, Commons, chosen) {

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

        /* Load template. */
        var source = $(templates).filter('#charts_structure_domain').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            item_label: translate.item,
            emissions_label: translate.emissions,
            activity_data_label: translate.emissions_activity,
            chart_row: [
                {
                    item_label: 'Buffaloes',
                    left_chart_id: 'Left',
                    right_chart_id: 'Right'
                }
            ]
        };
        var html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).empty().html(html);

        $('.chosen-select').chosen();

    };

    return GHG_QA_QC;

});