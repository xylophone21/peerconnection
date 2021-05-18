var s_server;
var s_my_name;
var s_my_id;

var s_your_id = -1;

var s_fetch_controller;
var s_fetch_signal;

var s_other_peers = {};

function configure_logging() {
    function log(level, messages) {
        const text = messages
            .map(message => {
                if (typeof message === 'object') {
                    return JSON.stringify(message, null, 2);
                } else {
                    return message;
                }
            })
            .join(' ');
        $('#logs').append($(`<div class="${level.toLowerCase()}">`).text(`[${new Date().toISOString()}] [${level}] ${text}\n`));
    }

    console._error = console.error;
    console.error = function(...rest) {
        log('ERROR', Array.prototype.slice.call(rest));
        console._error.apply(this, rest);
    };

    console._warn = console.warn;
    console.warn = function(...rest) {
        log('WARN', Array.prototype.slice.call(rest));
        console._warn.apply(this, rest);
    };

    console._log = console.log;
    console.log = function(...rest) {
        log('INFO', Array.prototype.slice.call(rest));
        console._log.apply(this, rest);
    };
}

function load_and_save_files() {
    const fields = [
        { field: 'server', type: 'text' },
        { field: 'my_name', type: 'text' },
        { field: 'you_name', type: 'text' },
    ];
    fields.forEach(({ field, type, name }) => {
        const id = '#' + field;
    
        // Read field from localStorage
        try {
            const localStorageValue = localStorage.getItem(field);
            if (localStorageValue) {
                if (type === 'checkbox' || type === 'radio') {
                    $(id).prop('checked', localStorageValue === 'true');
                } else {
                    $(id).val(localStorageValue);
                }
                $(id).trigger('change');
            }
        } catch (e) {
            /* Don't use localStorage */
        }
    
        // Write field to localstorage on change event
        $(id).change(function() {
            try {
                if (type === 'checkbox') {
                    localStorage.setItem(field, $(id).is(':checked'));
                } else if (type === 'radio') {
                    fields
                        .filter(fieldItem => fieldItem.name === name)
                        .forEach(fieldItem => {
                            localStorage.setItem(fieldItem.field, fieldItem.field === field);
                        });
                } else {
                    localStorage.setItem(field, $(id).val());
                }
            } catch (e) {
                /* Don't use localStorage */
            }
        });
    });
}

function get_random_string(length) {
    return Math.random()
        .toString(36)
        .slice(-length)
        .toLowerCase();
}

function prepare_view() {
    // disable button
    $('#disconnect').attr("disabled","disabled");
    $('#offser').attr("disabled","disabled");

    // random my_name
    const my_name = $('#my_name').val();
    const names = my_name.split("@");
    const new_name = names[0] + "@" + get_random_string(8);
    $('#my_name').val(new_name);
}

function get_int_header(response, name, def = -1) {
    var val = response.headers.get(name);
    return val != null && val.length ? parseInt(val) : def;
}

function handle_peer_update(data) {
    var parsed = data.split(',');
    if (parseInt(parsed[2]) != 0) {
        s_other_peers[parseInt(parsed[1])] = parsed[0];
    } else {
        delete s_other_peers[parseInt(parsed[1])];  
    }
    console.log("Update other peers to:",s_other_peers);
}

function handle_peer_message(peer_id, data) {
    if (s_your_id == -1) {
        s_your_id = peer_id;
        console.log("Set your_id = " + s_other_peers[peer_id] + "(" + peer_id + ")");
    }

    // only supports message from one peer yet
    if (peer_id == s_your_id) {
        console.log("Got Message from " + s_other_peers[peer_id] + "(" + peer_id + "):" + data);

    } else {
        console.log("peer_id not match, want " + s_other_peers[s_your_id] + "(" + s_your_id + ") but got " + s_other_peers[peer_id] + "(" + peer_id + ")");
    }
}

async function connect() {
    s_server = $('#server').val().toLowerCase();;
    s_my_name = $('#my_name').val().toLowerCase();
    if (s_my_name.length == 0) {
        alert("I need a name please.");
        $('#my_name').focus();
    } else {
        console.log("connect with " + s_my_name);

        const response = await fetch(s_server + "/sign_in?" + s_my_name);
        if (!response.ok) {
            console.error("connect error:" + response.status);
            return;
        }
        const responseText = await response.text();

        const peers = responseText.split("\n");
        s_my_id = parseInt(peers[0].split(',')[1]);
        console.log("my_id =",s_my_id);

        for (var i = 1; i < peers.length; ++i) {
            if (peers[i].length > 0) {
                console.log("Peer " + i + ": " + peers[i]);
                const parsed = peers[i].split(',');
                s_other_peers[parseInt(parsed[1])] = parsed[0];
            }
        }

        s_your_id = -1;

        s_fetch_controller = new AbortController();
        s_fetch_signal = s_fetch_controller.signal;

        pool_message();

        $('#connect').attr("disabled","disabled")
        $('#disconnect').removeAttr("disabled");
        $('#offser').removeAttr("disabled");
    }
}

async function disconnect() {
    console.log("disconnect with " + s_my_name + "(id=" + s_my_id + ")");
    if (s_my_id != -1) {
        s_fetch_controller.abort();
        s_fetch_controller = null;
        s_fetch_signal = null;

        const response = await fetch(s_server + "/sign_out?peer_id=" + s_my_id);
        if (!response.ok) {
            console.error("disconnect error:" + response.status);
            return;
        }

        console.log("disconnect success");

        s_my_id = -1;
        s_your_id = -1;
        $('#connect').removeAttr("disabled");
        $('#disconnect').attr("disabled","disabled")
        $('#offser').attr("disabled","disabled")
    }
}

async function pool_message() {
    console.log("pool_message of:" + s_my_id);
    if (s_my_id != -1) {
        try {
            const response = await fetch(s_server + "/wait?peer_id=" + s_my_id, {signal : s_fetch_signal});
            if (!response.ok) {
                console.error("pool_message error:" + response.status);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                const peer_id = get_int_header(response,"Pragma");
                const responseText = await response.text();
                if (peer_id == s_my_id) {
                    handle_peer_update(responseText);
                }else {
                    handle_peer_message(peer_id,responseText);
                }
            }
        } catch(err) {
            console.log("pool_message error:"+err);
            if (err.name === 'AbortError') {
                return;
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        await pool_message();
    }
}

configure_logging();
load_and_save_files();
prepare_view();

$('#connect').click(async () => {
    connect();
});

$('#disconnect').click(async () => {
    disconnect();
});


$('#clearlog').click(async () => {
    $('#logs').empty();
});