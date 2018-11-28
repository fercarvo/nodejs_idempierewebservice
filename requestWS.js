/**
 * @author Edgar Carvajal <efcu93@gmail.com>
 */

var request = require('request');
var parseString = require('xml2js').parseString;

/**
 * Funcion que ejecuta un WebService de iDempiere 3.1 y obtiene una respuesta exitosa o de Error
 * 
 * @author Edgar Carvajal <https://fercarvo.github.io>
 * 
 * @param {string} server URL del Servidor iDempiere ejm: https://app.comp.com o http://app.foo.com:8088
 * @param {string} ws_name Nombre del Web Service configurado en iDempiere
 * @param {Object} ctx parametros del usuario que ejecuta el WebService
 * @param {string} ctx.username Nombre de usuario iDempiere 
 * @param {string} ctx.password Calve del usuario iDempiere
 * @param {number} ctx.ad_client_id ID Grupo empresarial del usuario
 * @param {number} ctx.ad_role_id ID Rol del usuario
 * @param {number} ctx.ad_org_id ID organizacion del usuario
 * @param {number} ctx.m_warehouse_id ID warehouse del usuario, puede obviarse
 * @param {Array<{column:string, val:string}>} params Arreglo de los parametros que se enviaran al servicio web, column: clave, val: valor
 * 
 * @returns {Promise<string>} Resolve o Reject una promesa que será del tipo string
 */
function requestWS(server, ws_name, ctx, params) {
    var soap = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:_0="http://idempiere.org/ADInterface/1_0">
   <soapenv:Header/>
   <soapenv:Body>
      <_0:runProcess>
         <_0:ModelRunProcessRequest>
            <_0:ModelRunProcess>
                <_0:serviceType>${ws_name}</_0:serviceType>
                <_0:ParamValues>
                    ${params.reduce((acum, obj) => { return acum + `
                        <_0:field column="${obj.column}">
                            <_0:val>${obj.val === undefined || obj.val === null ? '' : obj.val}</_0:val>
                        </_0:field>`
                    }, '')}
                </_0:ParamValues>
            </_0:ModelRunProcess>
            <_0:ADLoginRequest>
               <_0:user>${ctx.username}</_0:user>
               <_0:pass>${ctx.password}</_0:pass>
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
            //console.log(body)

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
                        if (iserror) {
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