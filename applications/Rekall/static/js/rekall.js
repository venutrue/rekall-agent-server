// Various utilities for the UI
rekall.utils = {};

rekall.utils.api = function(endpoint) {
  return rekall.globals.api_route + endpoint;
}

rekall.utils.escape_text = function(text) {
  return $("<div>").text(text).html();
}


rekall.utils.get = function(obj, item, def) {
  var result = obj[item];
  if (result === undefined) {
    return def;
  }
  return result;
}

rekall.utils.make_link = function(url, image) {
  var link = $("<a>");
  link.attr("href", url);
  var img = $("<img class='icon'>");
  img.attr("src", rekall.globals.image_dir + image);
  link.append(img);
  return link.prop('outerHTML');
}

// Watch clicks on watch_selector for any enabled checkboxes and enable/disable
// the button in response.
rekall.utils.watch_checkboxes_to_disabled_button = function(
    watch_selector, button_seletor) {
  $(watch_selector).on("click", function() {
    var checked = false;

    $(this).find("input[type=checkbox]").each(function () {
      if (this.checked) checked=true;
    });

    if (checked) {
      $(button_seletor).removeClass("disabled");
    } else {
      $(button_seletor).addClass("disabled");
    }
  });
}

rekall.utils.update_badge = function() {
  $.ajax({
    url: rekall.utils.api('/users/notifications/count'),
    success: function(count) {
      if (count == 0) count = "";
      $("#notifications").text(count);
    },
    error: function() {}, // Ignore errors.
  });
}


rekall.utils.jsonSyntaxHighlight = function (json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var result = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    var cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });

  return "<pre>" + result + "</pre>";
}

// Escape text to html safely.
rekall.utils.safe_html = function(text) {
  return $("<div>").text(text).html();
}

rekall.utils.error = function(jqXHR) {
  $("#modalContainer").html(
      rekall.templates.modal_template(
          rekall.utils.safe_html(jqXHR.responseText),
          "Error: " + jqXHR.statusText,
          ));
  $("#modal").modal("show");
}

// Templates. We use jquery native templates because these are faster and safer
// than other javascript based templates.
rekall.templates = {}
rekall.templates.modal_template = function(body, title, footer) {
  var result = $(`
  <div class="modal fade" id="modal" tabindex="-1" role="dialog"
       aria-labelledby="myModalLabel">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal"
                  aria-label="Close">
             <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title"></h4>
        </div>
        <div class="modal-body">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default"
                  data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
`);
  result.find(".modal-title").text(title);
  result.find(".modal-body").html(body);
  if (footer) {
    result.find(".modal-footer").append(footer);
  }

  return result;
}



// Client controller.
rekall.clients = {}

rekall.clients.render_client_info = function(client_id, selector) {
  $.ajax({
    url: rekall.utils.api('/client/search'),
    data: {
      query: client_id
    },
    success: function(client_info) {
      // There should be some results.
      if (client_info.data.length > 0) {
        $(selector).html(
            rekall.cell_renderers.generic_json_renderer(client_info.data[0]));
      }
    },
    error: rekall.utils.error,
  });
}


rekall.clients.search_clients = function (query, selector) {
  var dataset_cache = {}

  $(selector).DataTable({
    ajax: {
      url: rekall.utils.api('/client/search'),
      data: {
        query: query
      },
      error: rekall.utils.error,
    },
    columns: [
      {
        title: "Flows",
        data: "client_id",
        searchable: false,
        orderable: false,
        render: function(client_id, type, row, meta) {
          var link = $("<a>");
          link.attr("href", rekall.globals.controllers.inspect_list + "?" + $.param({
            client_id: client_id}));
          var img = $("<img class='icon'>");
          img.attr("src", rekall.globals.image_dir + 'launch-icon.png');
          link.append(img);
          return link.prop('outerHTML');
        },
      },
      {
        title: "Client ID",
        data: "summary.client_id",
        searchable: false,
        orderable: false,
      },
      {
        title: "Last",
        data: "last",
        type: "unix",
      },
      {
        title: "System",
        data: "summary.system_info",
        render: function(cell_data, type, row, meta) {
          var text = (cell_data.system + " " +
              cell_data.release + " " +
              cell_data.version + " " +
              "(" + cell_data.kernel + ")");

          return $("<div>").text(text).html();
        }
      },
      {
        title: "Client Information",
        data: "summary",
        render: function(cell_data, type, row, meta) {
          var text = cell_data.system_info.fqdn;
          return rekall.cell_renderers.generic_json_pp(
              dataset_cache, text, "summary",
              cell_data, type, row, meta);
        }
      }
    ],
  });

  rekall.cell_renderers.generic_json_pp_clicks(
      dataset_cache, "summary", "Summary", selector);
}


rekall.flows = {}
rekall.flows.list_plugins = function(launch_url, client_id, selector) {
  $(selector).DataTable( {
    ajax: {
      url: rekall.utils.api("/plugin/list"),
    },
    columns: [
      {
        data: "plugin",
        searchable: false,
        render: function (plugin, type, full, meta) {
          var img = $("<img class='icon'>");
          img.attr("src", rekall.globals.image_dir + 'launch-icon.png');
          var link = $("<a>");
          link.append(img);
          link.attr("href", launch_url + "?" + $.param({
            plugin: plugin,
            client_id: client_id
          }));
          return link.prop("outerHTML");
        },
      },
      {
        title: "Plugin",
        data: "plugin",
        render: function (plugin, type, full, meta) {
          var result = $('<div class="collection_cell_rich plugin">');
          result.text(plugin);
          return result.prop('outerHTML');
        },
      },
      {
        title: "Name",
        data: "name",
      },
    ]
  });

  // Place a single click handler on the table and use sub-selector to only
  // activate when the click happened on a rich cell.
  $(selector).on("click", ".collection_cell_rich.plugin", function (){
    var plugin = $(this).text();

    $.getJSON(rekall.utils.api("/plugin/get"), {plugin: plugin},
              function(data) {
                $("#modalContainer").html(
                    rekall.templates.modal_template(
                        rekall.cell_renderers.generic_json_renderer(data),
                        "Plugin " + plugin,
                        ));
                $("#modal").modal("show");
              });
  });
}


rekall.flows.list_flows_for_client = function(client_id, selector) {
  var flow_cache = {};
  var status_cache = {};

  $(selector).DataTable({
    ajax: {
      url: rekall.utils.api("/flows/list"),
      data: {
        client_id: client_id
      },
      error: function(jqXHR) {
        // Permission denied means the user has no access to the client. Launch
        // the approval workflow.
        if (jqXHR.status == 403) {
          window.location.replace(
              rekall.globals.controllers.request_approval + "?" + $.param({
                client_id: client_id}));
        } else {
          rekall.utils.error(jqXHR);
        };
      }
    },
    columns: [
      {
        title: "",
        data: "flow",
        render: function(flow, type, row, meta) {
          var checkbox = $('<input name="flow_ids" type="checkbox">');
          checkbox.attr("value", flow.flow_id);
          return checkbox.prop("outerHTML");
        }
      },
      {
        title: "Time",
        data: "timestamp",
        type: "unix",
      },
      {
        title: "Flow",
        data: "flow",
        render: function(flow, type, row, meta) {
          var text = rekall.cell_renderers.flow_summary_renderer(flow);
          return rekall.cell_renderers.generic_json_pp(
              flow_cache, text, "flow",
              flow, type, row, meta);
        }
      },
      {
        title: "Creator",
        data: "creator",
      },
      {
        title: "Status",
        data: "status",
        render: function(status, type, row, meta) {
          var text = status.status;
          return rekall.cell_renderers.generic_json_pp(
              status_cache, text, "status",
              status, type, row, meta);
        }
      },
      {
        title: "Collections",
        data: "status.collection_ids",
        render: rekall.cell_renderers.collection_ids_renderer,
      },
      {
        title: "Files",
        data: "flow",
        render: function(flow, type, row, meta) {
          return rekall.utils.make_link(
              rekall.globals.controllers.uploads_view + "?" + $.param({
                flow_id: flow.flow_id}), "launch-icon.png");
        }
      },
    ],
  });
  rekall.cell_renderers.generic_json_pp_clicks(
      flow_cache, "flow", "Flow Information", selector);

  rekall.cell_renderers.generic_json_pp_clicks(
      status_cache, "status", "Flow Status", selector,
      rekall.cell_renderers.status_detailed_renderer);
}


rekall.uploads = {}
rekall.uploads.list_uploads_for_flow = function(flow_id, selector) {
  var file_info_cache = {};

  $(selector).DataTable({
    ajax: {
      url: rekall.utils.api("/uploads/list"),
      data: {
        flow_id: flow_id
      }
    },
    columns: [
      {
        title: "filename",
        data: "file_information",
        render: function(file_info, type, row, meta) {
          var text = file_info.filename;
          return rekall.cell_renderers.generic_json_pp(
              file_info_cache, text, "finfo",
              file_info, type, row, meta);
        }
      },
      {
        title: "Download",
        data: "upload_id",
        render: function(upload_id, type, row, meta) {
          var filename = row.file_information.filename;
          if (!filename) {
            filename = "download_" + upload_id;
          }
          return rekall.utils.make_link(
              rekall.globals.controllers.download + "?" + $.param({
                upload_id: upload_id,
                filename: filename}),
              'launch-icon.png');
        }
      },
      {
        title: "HexView",
        data: "upload_id",
        render: function(upload_id, type, row, meta) {
          return rekall.utils.make_link(
              rekall.globals.controllers.hex_view + "?" + $.param({
                upload_id: upload_id}), 'launch-icon.png');
        }
      },
    ]
  });

  rekall.cell_renderers.generic_json_pp_clicks(
      file_info_cache, "finfo", "File Information", selector);
}


rekall.uploads.hex_view = function(upload_id, selector) {
  var width = 32;
  var height = 200;

  var url = (rekall.globals.controllers.download +
      "?" + $.param({upload_id: upload_id}));
  $.ajax({
    url: url,
    type: "GET",
    responseType: 'arraybuffer',
    dataType: "binary",
    headers: {
      "Range": ("bytes=0-" + (width * height)),
    },
    processData: false,
    success: function(result, textStatus, request){
      var content_range = request.getResponseHeader('Content-Range');
      var match = new RegExp(".+([0-9]+)-([0-9]+)/([0-9]+)$").exec(content_range || "");
      if (match) {
        var start = parseInt(match[1]);
        var end = parseInt(match[2]);
        var total_length = parseInt(match[3]);
      }
      var bytes = new Uint8Array(result);
      var text = "";
      var hex = "";
      for (var i=0; i<bytes.length; i++) {
        if (i > 0 && (i % width) == 0) {
          hex += "\n";
          text += "\n";
        }

        var chr = bytes[i];
        var hex_string = chr.toString(16);
        if (hex_string.length == 1) {
          hex_string = "0" + hex_string;
        }
        hex += hex_string + " ";
        if (chr < 32 || chr > 127) {
          text += ".";
        } else {
          text += String.fromCharCode(chr);
        };
      }

      var result = $("<div class='row'>");
      result.append($("<pre class='col-xs-4 col-md-7'></pre>").text(hex));
      result.append($("<pre class='col-xs-4 col-md-4'></pre>").text(text));

      $(selector).html(result);
      if(match) {
        $(selector).before($("<div>").text(
            "Showing content " + start + " - " + end + " / " + total_length));
      }
    }
  });
}


// Cell renderers for DataTables
rekall.cell_renderers = {}
rekall.cell_renderers.generic_json_pp = function(
    dataset_cache,
    text,
    cls,
    cell_data,
    type, row, meta) {
  var result = $('<div class="collection_cell_rich">');
  result.addClass(cls);
  var key = meta.row.toString() + "," + meta.col.toString();
  dataset_cache[key] = cell_data;
  result.attr('data-key', key);
  result.text(text);

  return result.prop('outerHTML');
}

rekall.cell_renderers.generic_json_pp_clicks = function(
    dataset_cache,
    cls,
    title,
    selector,
    detailed_renderer) {

  if (detailed_renderer == null) {
    detailed_renderer = rekall.cell_renderers.generic_json_renderer;
  }

  // Place a single click handler on the table and use sub-selector to only
  // activate when the click happened on a rich cell.
  $(selector).on("click", ".collection_cell_rich" + "." + cls, function (){
    var key = $(this).data('key');
    var cell_data = dataset_cache[key];

    $("#modalContainer").html(
        rekall.templates.modal_template(
            detailed_renderer(cell_data),
            title,
            ));

    $("#modal").modal("show");
  });
}


rekall.cell_renderers.generic_ajax_clicks = function(
    dataset_cache, // The cache object used to keep table references.
    cls,           // The dom class to apply to.
    title,         // A title appearing in the modal box.
    selector,      // The selector to attach the click event.
    ajax_cb,       // A callback used to formulate the ajax call. This should be
                   // of the form function (cell_data) -> {url: ...., data:
                   // {x=y}}.
    detailed_renderer, // Additional renderer to be attached to the result of
                       // the ajax call.
    ) {
  if (detailed_renderer == null) {
    detailed_renderer = rekall.cell_renderers.generic_json_renderer;
  }

  $(selector).on("click", ".collection_cell_rich", function (){
    var key = $(this).data('key');
    var data_cell = dataset_cache[key];

    var ajax = ajax_cb(data_cell);

    ajax.success = function(data) {
      $("#modalContainer").html(
          rekall.templates.modal_template(
              detailed_renderer(data),
              title,
              ));
      $("#modal").modal("show");
    };

    $.ajax(ajax);
  });


}

rekall.cell_renderers.generic_json_renderer = function(obj) {
  return rekall.utils.jsonSyntaxHighlight(
      JSON.stringify(obj, undefined, 4))
}

rekall.cell_renderers.status_detailed_renderer = function(status) {
  var result = "";

  var json = rekall.utils.jsonSyntaxHighlight(
      JSON.stringify(status, undefined, 4));

  if (status.status == "Error") {
    var pre = $("<pre>");
    pre.text(status.backtrace);
    result += "<h3>Backtrace</h2>";
    result += pre.prop("outerHTML");
    result += `<a class="btn btn-primary" role="button" data-toggle="collapse"
        href="#jsonDetails" aria-expanded="false" aria-controls="jsonDetails">
        More details
        </a>`;

    result += '<div class="collapse" id="jsonDetails">';
    result += json;
    result += '</div>';

  } else {
    result +=  json;
  }

  return result;
}

// A renderer to show some important information about the flow.
rekall.cell_renderers.flow_summary_renderer = function(flow) {
  var result = "";

  for (var i=0; i<flow.actions.length; i++) {
    var action = flow.actions[i];

    if (action.__type__ == "PluginAction") {
      result += "PluginAction(" + action.plugin + ") ";
    }
  }

  return rekall.utils.escape_text(result);
}

rekall.cell_renderers.collection_ids_renderer = function(
    collection_ids, type, row, meta) {
  var result = "";
  if (!collection_ids) {
    return result;
  }

  for (var i=0; i<collection_ids.length; i++) {
    result += rekall.utils.make_link(
        rekall.globals.controllers.collection_view + "/" +
            collection_ids[i], "launch-icon.png");
  }

  return result;
}


// Render the message in the table. Note that the message can not be an
// arbitrary format. It is a reference into a named template which is used to
// expand the args. This allows us to include HTML safely without worrying about
// XSS from the sender of the message.
rekall.cell_renderers.notification_message = function(
    message_id, type, row, meta) {
  if (message_id == "APPROVAL_REQUEST") {
    var result = $("<div>Please <a>approve</a> client <b></b>.</div>");
    client_id = rekall.utils.get(row.args, "client_id", "");
    user = rekall.utils.get(row.args, "user", "");
    role = rekall.utils.get(row.args, "role", "");
    result.find("b").text(client_id);
    result.find("a").attr(
        "href", rekall.globals.controllers.approve_request + "?" + $.param({
          client_id: client_id,
          user: user,
          role: role
        }));

    return result.html();
  }

  // Message id not recognized so we just include it as text.
  return rekall.utils.safe_html(message_id);
}



// User management.
rekall.users = {}

rekall.users.list_users = function (selector) {
  var user_cache = {};
  var roles_cache = {};

  $(selector).DataTable({
    ajax: {
      url: rekall.utils.api("/users/list"),
      error: rekall.utils.error,
    },
    columns: [
      {
        title: "",
        data: "user",
        render: function(user, type, row, meta) {
          var checkbox = $('<input type="checkbox">');
          checkbox.attr("data-user", row.user);
          checkbox.attr("data-resource", row.resource);
          checkbox.attr("data-role", row.role);
          return checkbox.prop("outerHTML");
        }
      },
      {
        title: "User",
        data: "user",
      },
      {
        title: "Resource",
        data: "resource",
      },
      {
        title: "Roles",
        data: "role",
        render:  function(role, type, row, meta) {
          return rekall.cell_renderers.generic_json_pp(
              roles_cache, role, "role",
              role, type, row, meta);
        },
      },
      {
        title: "Conditions",
        data: "conditions",
        defaultContent: "<i>Not set</i>"
      }
    ]
  });

  rekall.cell_renderers.generic_ajax_clicks(
      roles_cache,
      "role",
      "Role Description",
      selector,
      function (role) {
        return {
          url: rekall.utils.api("/users/roles/get"),
          data: {role: role}
        }
      });
}


rekall.users.remove_users = function(selector) {
  var counter = 0;

  $(selector).find("input[type=checkbox]").each(function () {
    var self = $(this);
    if (this.checked) {
      counter++;
      $.ajax({
        url: rekall.utils.api("/users/delete"),
        data: {
          user: self.attr("data-user"),
          resource: self.attr("data-resource"),
          role: self.attr("data-role"),
        },
        success: function() {
          counter--;
          if (counter == 0) {
            location.reload();
          };
        },
      });
    }
  });
}

rekall.users.show_notifications = function() {
  var button = $(
      `<button type="button" class="btn btn-default"
         data-dismiss="modal" id="clear">Clear</button>
      `).on("click", function() {
        $.ajax({
          url: rekall.utils.api("/users/notifications/clear"),
          error: function() {}, // Ignore errors.
          success: function() {},
        });
      });

  var table = rekall.templates.modal_template(
      '<table class="display" cellspacing="0" width="80%"></table>',
      "Notifications", button);
  table.find("table").DataTable({
       ajax: {
         url: rekall.utils.api("/users/notifications/read"),
       },
       columns: [
         {
           title: "From",
           data: "from_user"
         },
         {
           title: "Timestamp",
           data: "timestamp",
         },
         {
           title: "Message",
           data: "message_id",
           render: rekall.cell_renderers.notification_message,
         }
       ]
     });

  $("#modalContainer").html(table);
  $("#modal").modal("show");
}



rekall.collections = {}
rekall.collections.build_table_from_collection = function (url, selector) {
  $.ajax({
    dataType: "json",
    xhr: function() {
      var xhr = new window.XMLHttpRequest();
      xhr.addEventListener("progress", function(evt){
        // Adjust the progress bar as we load the collection file.
        if (evt.lengthComputable) {
          var percentComplete = parseInt(evt.loaded / evt.total * 100) + "%";
          $("#progressbar .progress-bar").css('width', percentComplete).text(
              percentComplete);
        }
      }, false);

      return xhr;
    },
    url: url,
    error: rekall.utils.error,
    success: function (data) {
      var nav_tabs = $('<ul class="nav nav-tabs" role="tablist">');
      var tab_content = $("<div class='tab-content'>");

      rekall.utils.get(data, "tables", []).forEach(function (table) {
        var table_dom = $('<table class="display" cellspacing="0">')
            .attr("id", table.name);

        var id = "pane_" + table.name;

        nav_tabs.append(
            $('<li role="presentation">').append(
                $("<a role='tab'>")
                    .attr("href", "#" + id)
                    .text(table.name)
                ));

        tab_content.append(
            $("<div class='tab-pane' role='tabpanel'>")
                .attr("id", id).append(
                    $("<div class='panel panel-default'>").append(
                        $("<div class='panel-body'>")
                            .append(table_dom))));

        var columns = [];
        var dataset_cache = {};

        rekall.utils.get(table, "columns", []).forEach(function (column) {
          var name = column.name;
          var cell_type = column.type;

          columns.push({title: name,
                        render: function(cell_data, type, row, meta) {
                          if (cell_data == null) {
                            return "";
                          }

                          // We would like to use templates but this is a really
                          // hot function and templates are just too slow.
                          if (cell_type == "any") {
                            if (type != "display" ||
                                cell_data.text == cell_data.data) {
                              return cell_data.text;
                            };

                            return rekall.cell_renderers.generic_json_pp(
                                dataset_cache, cell_data.text, "collection",
                                cell_data, type, row, meta);
                          }

                          if (cell_type == "epoch") {
                            return new Date(cell_data * 1000).toUTCString();
                          }

                          return $("<div>").text(cell_data).html();
                        }});
        });

        var dataset = data.table_data[table.name];
        var data_table = $(table_dom).DataTable({
          dom: '<"top"ifp<"clear">>rt<"bottom"lp<"clear">>',
          data: dataset,
          columns: columns,
          deferRender: false,
          bProcessing: true,
          bSortClasses: false,
        });

        rekall.cell_renderers.generic_json_pp_clicks(
            dataset_cache, "collection", "Exported Data", table_dom);
      });

      $(selector)
          .append(nav_tabs)
          .append(tab_content);

      $(selector + ' a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
      }).first().click();

      $("#progressbar").hide();
    }
  });
}

rekall.collections.describe_collection = function(collection_id, callback) {
  $.ajax({
    dataType: "json",
    url: rekall.utils.api('/collections/metadata'),
    data: {
      collection_id: collection_id
    },
    success: function(metadata) {
      callback(rekall.cell_renderers.flow_summary_renderer(metadata.flow));
    }
  });
}




// Hexviewer developed using information from:
// http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/

// use this transport for "binary" data type
$.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
  // check for conditions and support for blob / arraybuffer response type
  if (window.FormData &&
      ((options.dataType && (options.dataType == 'binary')) ||
      (options.data &&
      ((window.ArrayBuffer && options.data instanceof ArrayBuffer) ||
      (window.Blob && options.data instanceof Blob)))))
  {
    return {
      // create new XMLHttpRequest
      send: function(headers, callback){
        // setup all variables
        var xhr = new XMLHttpRequest(),
        url = options.url,
        type = options.type,
        async = options.async || true,
        // blob or arraybuffer. Default is blob
        dataType = options.responseType || "blob",
        data = options.data || null,
        username = options.username || null,
        password = options.password || null;

        xhr.addEventListener('load', function(){
          var data = {};
          data[options.dataType] = xhr.response;
          // make callback and send data
          callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
        });

        xhr.open(type, url, async, username, password);

        // setup custom headers
        for (var i in headers ) {
          xhr.setRequestHeader(i, headers[i] );
        }

        xhr.responseType = dataType;
        xhr.send(data);
      },
      abort: function(){
        jqXHR.abort();
      }
    };
  }
});