chrome.storage.local.get(['DecoderMemoryLimitInMegabytes','ShowDebugOutput'], function (options) {
    var DecoderMemoryLimitInbytes;
    if (options.DecoderMemoryLimitInMegabytes === undefined) {
        DecoderMemoryLimitInbytes = 32*1E6;
    } else {
        DecoderMemoryLimitInbytes = options.DecoderMemoryLimitInMegabytes*1E6 ;
    }
    Tiff.initialize({ TOTAL_MEMORY: DecoderMemoryLimitInbytes });

    // Disable console.log if ShowDebugOutput is false
    if (options.ShowDebugOutput !== true) {
        console.log = function() {};
    }
    
    function create_request_for_url( url, callback ){
        var request, tiff;
        request = new XMLHttpRequest();
        request.open( 'GET', url, true );
        request.responseType = 'arraybuffer';
        request.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                tiff = new Tiff({ buffer: this.response });
                callback( tiff.toCanvas() );
            }
        };
        request.onerror = function (e) {
            console.error(request.statusText);
        };
        request.send( );
    }

    chrome.webRequest.onBeforeRequest.addListener(
        function(details) {
            var asyncCancel = new Promise((resolve, reject) => {
                create_request_for_url( details.url, function( blob )
                {
                    //https://bugs.chromium.org/p/chromium/issues/detail?id=446453
                    //Cannot redirect to blob in Chrome or FF
                    //https://bugzilla.mozilla.org/show_bug.cgi?id=1256122
                    //Due to this bug, redirect to blank tab and open blob in new tab.
                    fetch(blob.toDataURL())
                        .then(res => res.blob())
                        .then(blob => {
                            let url = URL.createObjectURL(blob);
                                //chrome.tabs.create({
                                // "url": url},
                                //    function(tab) {}
                                //);
                                resolve({redirectUrl: url});  //This creates security error
                        });
                });
                //resolve({redirectUrl: "javascript:"});    //Replace with blank data
            });
            return asyncCancel;
        },
        {
            urls: [ "*://*/*.tiff", "*://*/*.tif", "*://*/*.Tiff", "*://*/*.Tif", "*://*/*.TIFF", "*://*/*.TIF" ],
            types: [ 'main_frame', 'sub_frame', 'image' ]
        },
        ["blocking", "requestBody"]
    );

    // chrome.webRequest.onHeadersReceived.addListener(
      // redirect_request_to_dataurl_if_response_content_type_is_tiff,
      // {
        // urls: [ '<all_urls>' ],
        // types: [ 'main_frame', 'sub_frame', 'image' ]
      // },
      // [ 'blocking', 'responseHeaders' ]
    // );
});

