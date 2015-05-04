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

        /* Register partials. */
        Handlebars.registerPartial('verification_structure', $(templates).filter('#verification_structure').html());

        /* Load template. */
        var source = $(templates).filter('#faostat_ui_analysis_ghg_qaqc').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            geographic_area_label: translate.areas,
            domain_label: translate.domains,
            domains: [
                {id: 'gt', label: translate.gt},
                {id: 'ge', label: translate.ge},
                {id: 'gm', label: translate.gm},
                {id: 'gr', label: translate.gr},
                {id: 'gas', label: translate.gas},
                {id: 'gb', label: translate.gb},
                {id: 'gh', label: translate.gh}
            ],
            agriculture_label: translate.agriculture,
            land_use_label: translate.land_use
        };
        var html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).empty().html(html);

        /* Populate countries. */
        var rest_config = {
            domain: 'GT',
            tab_group: 1,
            tab_index: 1,
            datasource: this.CONFIG.datasource,
            lang_faostat: this.CONFIG.lang_faostat
        };
        Commons.wdsclient('procedures/usp_GetListBox', rest_config, function(json) {

            /* Populate the dropdown. */
            var s = '<option value="null"></option>';
            for (var i = 0 ; i < json.length ; i++)
                s += '<option value="' + json[i][0] + '">' + json[i][1] + '</option>';
            $('#geographic_areas').html(s).chosen();
            //$('#geographic_areas').chosen();

        }, 'http://localhost:8080/wds/rest');

        /* Initiate ChosenJS. */
        $('#domains').chosen();

        /* Test WDS Tables. */
        //var sql =   "SELECT * " +
        //            "FROM UNFCCC_GAS " +
        //            "WHERE areacode = '10' " +
        //            "AND Year >= 1990 AND Year <= 2012 " +
        //            "AND tabletype = 'emissions' " +
        //            "ORDER BY UNFCCCCode, Year DESC";
        //Commons.wdstable(sql, function(json) {
        //
        //    /* Initiate wide tables library. */
        //    var wt_1 = new WIDE_TABLES();
        //
        //    /* Initiate the library. */
        //    wt_1.init({
        //        lang: _this.CONFIG.lang,
        //        data: json,
        //        placeholder_id: _this.CONFIG.placeholder_id,
        //        show_row_code: true,
        //        row_code: 'UNFCCCCode',
        //        row_label: 'GUNFItemNameE',
        //        cols_dimension: 'Year',
        //        value_dimension: 'GUNFValue'
        //    });
        //
        //}, 'http://localhost:8080/wds/rest');

    };

    return GHG_QA_QC;

});