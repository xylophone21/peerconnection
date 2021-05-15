function configureLogging() {
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

configureLogging();
load_and_save_files();

$('#connect').click(async () => {
    const server = $('#server').val();
    const your_name = $('#my_name').val();

    const response = await fetch(server + "/sign_in?" + your_name);
    if (!response.ok) {
        console.error("connect error:" + response.status);
        return;
    }
    const responseText = await response.text();

    const peers = responseText.split("\n");
    my_id = parseInt(peers[0].split(',')[1]);
    console.log("my_id = ",my_id);

    for (var i = 1; i < peers.length; ++i) {
        if (peers[i].length > 0) {
            console.log("Peer " + i + ": " + peers[i]);
        }
    }
});