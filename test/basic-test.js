var vows = require('vows');
var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var safe = require('safe');
var loremIpsum = require('lorem-ipsum');
var tutils = require("./utils");

function dummyDataCheck(index) {
    var context = {
        topic: function (coll) {
			coll.find({}).skip(index).limit(1).nextObject(this.callback);
        }
    };
    context['ok'] = function (err, v) {
		assert.equal(Math.sin(v.num),v.sin);
	}
    return context;
}

function randomRead(max,size) {
	var context = {
		topic: function (coll) {
			return coll;
		}
	}

	context['at ' + 1] = dummyDataCheck(0);
	context['at ' + (max)] = dummyDataCheck(max-1);
	
	for (i=0; i<size;i++) {
		var index = Math.floor(Math.random() * max);
		context['at ' + index] = dummyDataCheck(index)
	}
	
	return context;
}

var num = 1000;
var gt0sin = 0;
var _dt = null;
var path = "./data";

vows.describe('Basic').addBatch({
	'New store':{
		topic: function () {
			tutils.getDb('test', true, this.callback);
		},
		"can be created by path":function (db) {
			assert.notEqual(db,null);
		},
		"collection":{
			topic:function (db) {
				var cb = this.callback;
				db.collection("test", {}, safe.sure(cb,function (coll) {
							cb(null, coll);
				}))
			},
			"can be created":function (coll) {
				assert.notEqual(coll,null);
			},			
			"populated with test data":{
				topic:function (coll) {
					var i=0;
					async.whilst(function () { return i<num}, 
						function (cb) {
							var d = new Date();
							if (_dt==null)
								_dt=d;
							var obj = {_dt:d, num:i, pum:i, sub:{num:i}, sin:Math.sin(i),cos:Math.cos(i),t:15,junk:loremIpsum({count:1,units:"paragraphs"})};
							coll.insert(obj, cb);
							if (obj.sin>0 && obj.sin<0.5)
							   gt0sin++;
							i++;
						},
						this.callback
					)
				},
				"ok":function() {
					},
				"has proper size":{
					topic:function (coll) {
						coll.count(this.callback);
					},
					"ok":function (err, size) {
						assert.equal(size, num);
					}
				},
				"random read":randomRead(num,1)
			}
		}
	}
}).addBatch({
	'Existing store':{
		topic: function () {
			tutils.getDb('test', false, this.callback);
		},
		"can be created by path":function (db) {
			assert.notEqual(db,null);
		},
		"test collection":{
			topic:function (db) {
				var cb = this.callback;
				db.collection("test", {}, safe.sure(cb,function (coll) {
					coll.ensureIndex({sin:1}, safe.sure(cb, function () {
						coll.ensureIndex({num:1}, safe.sure(cb, function () {
							coll.ensureIndex({_dt:1}, safe.sure(cb, function () {							
								cb(null, coll);
							}))
						}))
					}))
				}))
			},
			"exists":function (coll) {
				assert.notEqual(coll,null);
			},			
			"has proper size":{
				topic:function (coll) {
					coll.count(this.callback);
				},
				"ok":function (err, size) {
					assert.equal(size, num);
				}
			},
			"random read":randomRead(num,1),
			"dummy find $eq":{
				topic:function (coll) {
					var cb = this.callback;
					coll.find({num:10}, function (err,docs) {
						if (err) cb(err);
							else docs.toArray(cb)
					})
				},
				"got it":function (err, docs) {
					assert.equal(docs[0].num, 10);
					assert.equal(docs.length, 1);
				},
				"date field holds date":function (err, docs) {
					assert.equal(_.isDate(docs[0]._dt),true);
				}
			},
			"dummy find date":{
				topic:function (coll) {
					var cb = this.callback;
					coll.find({"_dt":_dt}, function (err,docs) {
						if (err) cb(err);
							else docs.toArray(cb)
					})
				},
				"got it":function (err, docs) {
					assert.equal(docs[0]._dt.toString(), _dt.toString());
				}
			},			
			"dummy find $gt":{
				topic:function (coll) {
					var cb = this.callback;
					coll.find({sin:{$gt:0,$lt:0.5},t:15}, function (err,docs) {
						if (err) cb(err);
							else docs.toArray(cb)
					})
				},
				"ok":function (err, docs) {
					assert.equal(docs.length, gt0sin);
				}
			},
			"dummy sort {num:1}":{
				topic:function (coll) {
					var cb = this.callback;
					coll.find({num:{$lt:11}}).sort({num:1}).toArray(cb);
				},
				"ok":function (err, docs) {
					assert.equal(err,null);					
					assert.equal(docs.length, 11);
					assert.equal(docs[0].num,0);
				}
			},
			"dummy sort {num:-1}":{
				topic:function (coll) {
					var cb = this.callback;
					coll.find({num:{$lt:11}}).sort({num:-1}).toArray(cb);
				},
				"ok":function (err, docs) {
					assert.equal(err,null);
					assert.equal(docs.length, 11);
					assert.equal(docs[0].num,10);
				}
			},		
			"dummy sort {pum:1}":{
				topic:function (coll) {
					var cb = this.callback;
					coll.find({pum:{$lt:11}}).sort({pum:1}).toArray(cb);
				},
				"ok":function (err, docs) {
					assert.equal(err,null);					
					assert.equal(docs.length, 11);
					assert.equal(docs[0].pum,0);
				}
			},
			"dummy sort {pum:-1}":{
				topic:function (coll) {
					var cb = this.callback;
					coll.find({pum:{$lt:11}}).sort({pum:-1}).toArray(cb);
				},
				"ok":function (err, docs) {
					assert.equal(err,null);
					assert.equal(docs.length, 11);
					assert.equal(docs[0].pum,10);
				}
			}			
		}
	}
}).addBatch({
	'Existing store':{
		topic: function () {
			tutils.getDb('test', false, this.callback);
		},
		"can be created by path":function (db) {
			assert.notEqual(db,null);
		},
		"test collection":{
			topic:function (db) {
				var cb = this.callback;
				db.collection("test", {}, safe.sure(cb,function (coll) {
					coll.ensureIndex({sin:1}, safe.sure(cb, function () {
						coll.ensureIndex({num:1}, safe.sure(cb, function () {
							coll.ensureIndex({_dt:1}, safe.sure(cb, function () {							
								cb(null, coll);
							}))
						}))
					}))
				}))
			},
			"exists":function (coll) {
				assert.notEqual(coll,null);
			},			
			"dummy update":{
				topic:function (coll) {
					var cb = this.callback;
					coll.update({pum:11},{$set:{num:10,"sub.tub":10,"sub.num":10},$unset:{sin:1}}, safe.sure(cb, function () {
						coll.findOne({pum:11},cb)
					}))
				},
				"ok":function (err, obj) {
					assert.equal(err,null);
					assert.equal(obj.pum, 11);
					assert.equal(obj.num, 10);
					assert.equal(obj.sub.num, 10);					
					assert.equal(obj.sub.tub, 10);	
					assert.equal(obj.sin,null);									
				}
			},
			"dummy remove":{
				topic:function (coll) {
					var cb = this.callback;
					coll.remove({pum:20}, safe.sure(cb, function () {
						coll.findOne({pum:20},cb)
					}))
				},
				"ok":function (err, obj) {
					assert.equal(err,null);
					assert.equal(obj,null);					
				}
			}	
			
		}
	}
}).export(module);