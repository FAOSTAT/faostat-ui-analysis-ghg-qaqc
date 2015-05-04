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
            placeholder_id: 'faostat_ui_analysis_ghg_qaqc_placeholder',
            domains: [
                {id: 'gt', label: translate.gt},
                {id: 'ge', label: translate.ge},
                {id: 'gm', label: translate.gm},
                {id: 'gr', label: translate.gr},
                {id: 'gas', label: translate.gas},
                {id: 'gb', label: translate.gb},
                {id: 'gh', label: translate.gh}
            ]
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

        /* Register partials. */
        Handlebars.registerPartial('verification_structure', $(templates).filter('#verification_structure').html());

        /* Load template. */
        var source = $(templates).filter('#faostat_ui_analysis_ghg_qaqc').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            domains: this.CONFIG.domains,
            domain_label: translate.domains,
            land_use_label: translate.land_use,
            geographic_area_label: translate.areas,
            agriculture_label: translate.agriculture
        };
        var html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).empty().html(html);

        /* Populate countries. */
        this.populate_countries();

        /* Initiate ChosenJS. */
        $('#domains').chosen();

        /* Load GT. */
        source = $(templates).filter('#gt_structure').html();
        template = Handlebars.compile(source);
        dynamic_data = {
            item_label: translate.item,
            emissions_label: translate.emissions,
            gt_label: translate.gt,
            ge_label: translate.ge,
            gm_label: translate.gm,
            gr_label: translate.gr,
            gas_label: translate.gas,
            gb_label: translate.gb,
            gh_label: translate.gh,
            data_not_available_label: translate.data_not_available
        };
        html = template(dynamic_data);
        $('#gt').empty().html(html);
        $('#gt_table_selector').chosen();
        $('.chosen-container.chosen-container-single').css('width', '100%');


        $('a[href="#gt"]').tab('show');
        $('a[href="#gt_charts"]').tab('show');

    };

    GHG_QA_QC.prototype.populate_countries = function() {
        var rest_config = {
            domain: 'GT',
            tab_group: 1,
            tab_index: 1,
            datasource: this.CONFIG.datasource,
            lang_faostat: this.CONFIG.lang_faostat
        };
        Commons.wdsclient('procedures/usp_GetListBox', rest_config, function(json) {
            var s = '<option value="null"></option>';
            for (var i = 0 ; i < json.length ; i++)
                s += '<option value="' + json[i][0] + '">' + json[i][1] + '</option>';
            $('#geographic_areas').html(s).chosen();
        }, 'http://localhost:8080/wds/rest');
    };

    return GHG_QA_QC;

});