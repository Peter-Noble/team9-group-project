var records = [
    {   id: 1,
        username: 'PeterN',
        password: 'secret',
        displayName: 'Peter',
        email: 'peter@noblesque.org.uk',
        type: 'Local'
    },
    {   id: 2,
        username: 'Team9',
        password: 'team',
        displayName: '9',
        email: 'definitely valid@e.mail',
        type: 'Local'
    },
    {   id: 3,
        username: '1191156497671018',
        password: '',
        displayName: 'Peter(Facebook)',
        email: 'peter@noblesque.org.uk',
        type: 'Facebook'
    },
];

exports.findById = function(id, cb) {
  process.nextTick(function() {
    var idx = id - 1;
    if (records[idx]) {
      cb(null, records[idx]);
    } else {
      cb(new Error('User ' + id + ' does not exist'));
    }
  });
}

exports.findByUsername = function(username, cb) {
  process.nextTick(function() {
    for (var i = 0, len = records.length; i < len; i++) {
      var record = records[i];
      if (record.username === username) {
        return cb(null, record);
      }
    }
    return cb(null, null);
  });
}

// Only use if sure the user exists
exports.getByUsername = function(username) {
    for (var i = 0, len = records.length; i < len; i++) {
        var record = records[i];
        if (record.username === username) {
            return record;
        }
    }
}
