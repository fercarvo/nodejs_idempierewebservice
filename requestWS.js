var request = require('request');
var parseString = require('xml2js').parseString;

function requestWS(server, process, ctx, username, password, params) {
    var soap = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:_0="http://idempiere.org/ADInterface/1_0">
   <soapenv:Header/>
   <soapenv:Body>
      <_0:runProcess>
         <_0:ModelRunProcessRequest>
            <_0:ModelRunProcess>
                <_0:serviceType>${process}</_0:serviceType>
                <_0:ParamValues>
                    ${params.reduce((acum, obj) => { return acum + `
                        <_0:field column="${obj.column}">
                            <_0:val>${obj.val}</_0:val>
                        </_0:field>`
                    }, '')}
                </_0:ParamValues>
            </_0:ModelRunProcess>
            <_0:ADLoginRequest>
               <_0:user>${username}</_0:user>
               <_0:pass>${password}</_0:pass>
               <_0:lang>es_EC</_0:lang>
               <_0:ClientID>${ctx.ad_client_id}</_0:ClientID>
               <_0:RoleID>${ctx.ad_role_id}</_0:RoleID>
               <_0:OrgID>${ctx.ad_org_id}</_0:OrgID>
               <_0:WarehouseID>${ctx.m_warehouse_id || 0}</_0:WarehouseID>
               <_0:stage>0</_0:stage>
            </_0:ADLoginRequest>
         </_0:ModelRunProcessRequest>
      </_0:runProcess>
   </soapenv:Body>
</soapenv:Envelope>`

    return new Promise((resolve, reject) => {
        var options = { 
            method: 'POST',
            url: `${server}/ADInterface/services/ModelADService`,
            headers: { 
                'Content-Type': 'text/xml; charset=utf-8' 
            },
            body: soap 
        }

        request(options, function (error, response, body) {
            console.log(body)

            if (error) {
                return reject(error.message)
            } else {
                parseString(body, (err, result) => {
                    if (err)
                        return reject(err)

                    result = result['soap:Envelope']['soap:Body'][0]['ns1:runProcessResponse'][0]
                    result = result['RunProcessResponse'][0]
                    var iserror = result['$']['IsError'] == "true"

                    if (response.statusCode !== 200 && response.statusCode !== 302) {
                        reject(response.statusCode +" "+ response.statusMessage)
                    } else {
                        if (iserror || (response.statusCode !== 200 && response.statusCode !== 302)) {
                            reject(result['Error'][0])
                        } else {
                            resolve(result['Summary'][0])
                        }
                    }
                })                 
            }                
        })    
    })    
}

module.exports = {
    requestWS
}