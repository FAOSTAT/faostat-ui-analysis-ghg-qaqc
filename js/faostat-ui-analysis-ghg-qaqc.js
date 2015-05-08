define(['jquery',
        'handlebars',
        'text!faostat_ui_analysis_ghg_qa_qc/html/templates.html',
        'i18n!faostat_ui_analysis_ghg_qa_qc/nls/translate',
        'FAOSTAT_UI_COMMONS',
        'FAOSTAT_UI_WIDE_TABLES',
        'chosen',
        'highcharts',
        'bootstrap',
        'sweetAlert'], function ($, Handlebars, templates, translate, Commons, WIDE_TABLES, chosen) {

    'use strict';

    function GHG_QA_QC() {

        this.CONFIG = {
            lang: 'en',
            data: {},
            charts_data: {},
            lang_faostat: 'E',
            datasource: 'faostatdata',
            placeholder_id: 'faostat_ui_analysis_ghg_qaqc_placeholder',
            domains: [
                {id: 'gt', label: translate.gt},
                {id: 'ge', label: translate.ge},
                {id: 'gm', label: translate.gm},
                {id: 'gr', label: translate.gr},
                {id: 'gas', label: translate.gas},
                {id: 'gb', label: translate.gb},
                {id: 'gh', label: translate.gh}
            ],
            table_types: ['emissions', 'activity'],
            url_wds: 'http://localhost:8080/wds/rest'
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

        /* Store JQuery selectors. */
        this.CONFIG.domains_selector = $('#domains');
        this.CONFIG.geo_selector = $('#geographic_areas');

        /* Populate countries. */
        this.populate_countries();

        /* On country change. */
        this.CONFIG.geo_selector.change(function() {

            /* Query DB, if needed. */
            _this.load_data(_this.CONFIG.geo_selector.val(), _this.get_selected_domain());

        });

        /* Domains selector. */
        this.CONFIG.domains_selector.chosen().change(function() {
            _this.load_tabs();
        });

    };

    GHG_QA_QC.prototype.populate_countries = function() {

        /* This... */
        var _this = this;

        /* Config WDS. */
        var rest_config = {
            domain: 'GT',
            tab_group: 1,
            tab_index: 1,
            datasource: this.CONFIG.datasource,
            lang_faostat: this.CONFIG.lang_faostat
        };

        /* Fetch data and populate the dropdown. */
        Commons.wdsclient('procedures/usp_GetListBox', rest_config, function(json) {

            /* Initiate options. */
            var s = '<option value="null"></option>';

            /* Iterate over results. */
            for (var i = 0 ; i < json.length ; i++)
                s += '<option value="' + json[i][0] + '">' + json[i][1] + '</option>';

            /* Populate dropdown and define change listener. */
            _this.CONFIG.geo_selector.html(s).chosen();

        }, this.CONFIG.url_wds);

    };

    GHG_QA_QC.prototype.load_tabs = function() {

        /* Domain type. */
        var domain_type = this.CONFIG.domains_selector.val();

        /* Load template. */
        var source = $(templates).filter('#tabs_' + domain_type).html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            domains: this.CONFIG.domains
        };
        var html = template(dynamic_data);
        $('#tabs_content').empty().html(html);

        /* Select first tab. */
        $('a[href="#gt"]').tab('show');

        /* Load domains. */
        for (var i = 0 ; i < this.CONFIG.domains.length ; i++) {
            try {
                this.load_domain(this.CONFIG.domains[i].id)
            } catch (e) {

            }
        }

    };

    GHG_QA_QC.prototype.load_domain = function(domain_code) {

        /* This... */
        var _this = this;

        /* Load template. */
        var source = $(templates).filter('#' + domain_code + '_structure').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            gt_label: translate.gt,
            ge_label: translate.ge,
            gm_label: translate.gm,
            gr_label: translate.gr,
            gb_label: translate.gb,
            gh_label: translate.gh,
            gas_label: translate.gas,
            item_label: translate.item,
            goats_label: translate.goats,
            sheep_label: translate.sheep,
            swine_label: translate.swine,
            charts_label: translate.charts,
            tables_label: translate.tables,
            horses_label: translate.horses,
            fertilizers_label: translate.gy,
            manure_soils_label: translate.gp,
            crop_residues_label: translate.ga,
            organic_soils_label: translate.gv,
            buffaloes_label: translate.buffaloes,
            emissions_label: translate.emissions,
            mules_asses_label: translate.mules_asses,
            cattle_dairy_label: translate.cattle_dairy,
            activity_label: translate.emissions_activity,
            camels_llamas_label: translate.camels_llamas,
            pasture_label: translate.pasture_paddock_manure,
            cattle_non_dairy_label: translate.cattle_non_dairy,
            indirect_soils_label: translate.indirect_emissions,
            direct_soils_label: translate.direct_soil_emissions,
            table_selector_label: translate.table_selector_label,
            data_not_available_label: translate.data_not_available
        };
        var html = template(dynamic_data);
        $('#' + domain_code).empty().html(html);

        /* Select first tab. */
        $('a[href="#' + domain_code + '_charts"]').tab('show');

        /* Table selector. */
        var table_selector = $('#' + domain_code + '_table_selector');
        table_selector.chosen().change(function() {
            _this.load_data(_this.CONFIG.geo_selector.val(), _this.get_selected_domain());
        });
        $('.chosen-container.chosen-container-single').css('width', '100%');

    };

    GHG_QA_QC.prototype.load_data = function(area_code, domain_code) {

        /* This... */
        var _this = this;

        /* Query DB, if needed. */
        if (this.CONFIG.data[area_code] == null) {

            /* SQL Query. */
            var sql = _this.get_query(area_code);

            /* Query the DB. */
            Commons.wdstable(sql, function (json) {

                /* Store data. */
                _this.CONFIG.data[area_code] = json;

                /* Create charts data. */
                _this.create_charts_data(area_code);

                /* Render tables. */
                _this.render_tables(domain_code);

            }, this.CONFIG.url_wds, {datasource: this.CONFIG.datasource});

        } else {

            /* Render tables. */
            this.render_tables(domain_code);

        }

    };

    GHG_QA_QC.prototype.create_charts_data = function(area_code) {

        console.log(this.get_query(area_code));

        var isDomain;
        var isType;
        var isCode;

        /* Check whether data already exists. */
        if (this.CONFIG.data[area_code] != null) {

            /* Iterate over domains. */
            for (var j = 0 ; j < this.CONFIG.domains.length ; j++) {

                /* Current domain code. */
                var domain_code = this.CONFIG.domains[j].id.toUpperCase();

                for (var z = 0 ; z < this.CONFIG.table_types.length ; z++) {

                    /* Table type: 'emissions' or 'activity'. */
                    var table_type = this.CONFIG.table_types[z];

                    /* Data for charts. */
                    var c_series = [];

                    var item_code = this.CONFIG.data[area_code][0].GUNFCode;

                    for (var i = 0; i < this.CONFIG.data[area_code].length; i++) {

                        if (domain_code == 'GE' && item_code == '1016')
                            console.log(this.CONFIG.data[area_code][i].GUNFCode +'=='+ item_code + ' ? ' + (this.CONFIG.data[area_code][i].GUNFCode == item_code));

                        if (this.CONFIG.data[area_code][i].GUNFCode == item_code) {

                            isDomain = this.CONFIG.data[area_code][i].DomainCode == domain_code;
                            isType = this.CONFIG.data[area_code][i].TableType == table_type;
                            isCode = this.CONFIG.data[area_code][i].GUNFCode == item_code;

                            if (isDomain && isType && isCode) {
                                c_series.push(this.CONFIG.data[area_code][i]);
                            }

                        } else {
                            this.register_chart_series(c_series, domain_code, item_code, table_type);
                            c_series = [];
                            item_code = this.CONFIG.data[area_code][i].GUNFCode;
                        }
                    }



                }

                /* Last iteration. */
                this.register_chart_series(c_series, domain_code, item_code, table_type);

            }

            console.log(this.CONFIG.charts_data);

        }

    };

    GHG_QA_QC.prototype.register_chart_series = function(chart_series, domain_code, item_code, table_type) {
        if (chart_series.length > 0) {
            if (this.CONFIG.charts_data[domain_code] == null)
                this.CONFIG.charts_data[domain_code] = {};
            if (this.CONFIG.charts_data[domain_code][item_code] == null)
                this.CONFIG.charts_data[domain_code][item_code] = {};
            if (this.CONFIG.charts_data[domain_code][item_code][table_type] == null)
                this.CONFIG.charts_data[domain_code][item_code][table_type] = {};
            this.CONFIG.charts_data[domain_code][item_code][table_type] = chart_series;
        }
    };

    GHG_QA_QC.prototype.render_tables = function(domain_code) {

        /* Table type. */
        var table_type = $('#' + domain_code + '_table_selector').val();

        try {

            /* Load template. */
            var source = $(templates).filter('#tables_' + table_type).html();
            var template = Handlebars.compile(source);
            var dynamic_data = {
                id: domain_code,
                nc_label: translate.nc,
                co2eq_label: translate.co2eq,
                faostat_label: translate.faostat,
                difference_label: translate.difference,
                export_data_label: translate.export_data_label,
                norm_difference_label: translate.norm_difference
            };
            var html = template(dynamic_data);
            $('#' + domain_code + '_tables_content').empty().html(html);

            /* Populate tables. */
            this.populate_tables(this.CONFIG.geo_selector.val());

        } catch (e) {

        }

    };

    GHG_QA_QC.prototype.get_query = function(area_code) {
        return  'SELECT DomainCode, Year, UNFCCCCode, GUNFItemNameE, ' +
                       'GUNFValue, GUNFCode, GValue, PerDiff, ' +
                       'NormPerDiff, TableType ' +
                'FROM DataUNFCCC ' +
                'WHERE AreaCode = \'' + area_code + '\' ' +
                'AND Year >= 1990 AND Year <= 2012 ' +
                'AND GUNFCode IS NOT NULL ' +
                'ORDER BY UNFCCCCode, Year DESC';
    };

    GHG_QA_QC.prototype.get_selected_domain = function() {
        return $($('#domains_tab').find('ul').find('li.active').find('a')[0]).attr('aria-controls');
    };

    GHG_QA_QC.prototype.populate_tables = function(area_code) {

        /* Table type. */
        var table_type = $('#gas_table_selector').val();

        /* Populate GAS tables. */
        this.populate_gas(area_code, table_type);

    };

    GHG_QA_QC.prototype.populate_gas = function(area_code, table_type) {

        /* Common configuration. */
        var wt_config = {
            show_row_code: true,
            row_code: 'UNFCCCCode',
            lang: this.CONFIG.lang,
            cols_dimension: 'Year',
            row_label: 'GUNFItemNameE'
        };

        /* Data for tables. */
        var gas_table_1 = [];
        for (var i = 0 ; i < this.CONFIG.data[area_code].length ; i++) {
            if (this.CONFIG.data[area_code][i].DomainCode == 'GAS' && this.CONFIG.data[area_code][i].TableType == table_type)
                gas_table_1.push(this.CONFIG.data[area_code][i]);
        }

        /* Initiate wide tables library. */
        var wt_1 = new WIDE_TABLES();
        var wt_2 = new WIDE_TABLES();
        var wt_3 = new WIDE_TABLES();
        var wt_4 = new WIDE_TABLES();

        /* Configure tables. */
        var wt_1_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'GValue',
            placeholder_id: 'gas_table_1'
        });
        var wt_2_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'GUNFValue',
            placeholder_id: 'gas_table_2'
        });
        var wt_3_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'PerDiff',
            placeholder_id: 'gas_table_3'
        });
        var wt_4_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'NormPerDiff',
            placeholder_id: 'gas_table_4'
        });

        /* Render tables. */
        wt_1.init(wt_1_config);
        wt_2.init(wt_2_config);
        wt_3.init(wt_3_config);
        wt_4.init(wt_4_config);

        /* Synchronize scrollbars. */
        for (i = 1 ; i < 5 ; i++) {
            var id = '#gas_table_' + i +'_scroll';
            $(id).scroll(function() {
                $(".wide_tables_scroll").scrollLeft($('#' + this.id).scrollLeft());
            });
        }

    };

    return GHG_QA_QC;

});