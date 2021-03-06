//>> Start Uglifui
(function ( global ) {

var jsp = global.parsejs, //require("./parse-js"),
    pro = global.process, //require("./process"),
//>> End Uglifui
    slice = jsp.slice,
    member = jsp.member,
    curry = jsp.curry,
    MAP = pro.MAP,
    PRECEDENCE = jsp.PRECEDENCE,
    OPERATORS = jsp.OPERATORS;

function ast_squeeze_more(ast) {
        var w = pro.ast_walker(), walk = w.walk, scope;
        function with_scope(s, cont) {
                var save = scope, ret;
                scope = s;
                ret = cont();
                scope = save;
                return ret;
        };
        function _lambda(name, args, body) {
                return [ this[0], name, args, with_scope(body.scope, curry(MAP, body, walk)) ];
        };
        return w.with_walkers({
                "toplevel": function(body) {
                        return [ this[0], with_scope(this.scope, curry(MAP, body, walk)) ];
                },
                "function": _lambda,
                "defun": _lambda,
                "new": function(ctor, args) {
                        if (ctor[0] == "name") {
                                if (ctor[1] == "Array" && !scope.has("Array")) {
                                        if (args.length != 1) {
                                                return [ "array", args ];
                                        } else {
                                                return walk([ "call", [ "name", "Array" ], args ]);
                                        }
                                } else if (ctor[1] == "Object" && !scope.has("Object")) {
                                        if (!args.length) {
                                                return [ "object", [] ];
                                        } else {
                                                return walk([ "call", [ "name", "Object" ], args ]);
                                        }
                                } else if ((ctor[1] == "RegExp" || ctor[1] == "Function" || ctor[1] == "Error") && !scope.has(ctor[1])) {
                                        return walk([ "call", [ "name", ctor[1] ], args]);
                                }
                        }
                },
                "call": function(expr, args) {
                        if (expr[0] == "dot" && expr[2] == "toString" && args.length == 0) {
                                // foo.toString()  ==>  foo+""
                                return [ "binary", "+", expr[1], [ "string", "" ]];
                        }
                        if (expr[0] == "name") {
                                if (expr[1] == "Array" && args.length != 1 && !scope.has("Array")) {
                                        return [ "array", args ];
                                }
                                if (expr[1] == "Object" && !args.length && !scope.has("Object")) {
                                        return [ "object", [] ];
                                }
                                if (expr[1] == "String" && !scope.has("String")) {
                                        return [ "binary", "+", args[0], [ "string", "" ]];
                                }
                        }
                }
        }, function() {
                return walk(pro.ast_add_scope(ast));
        });
}
//>> Start Uglifui
var squeezemore = {};
(function ( exports ) {
//>> End Uglifui
exports.ast_squeeze_more = ast_squeeze_more;
//>> Start Uglifui
})( squeezemore );

//global.squeezemore = squeezemore;
global.process.ast_squeeze_more = squeezemore.ast_squeeze_more;

})( this );
//>> End Uglifui
