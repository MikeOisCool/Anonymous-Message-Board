const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
    let thread_id; // Variable to store thread ID
    let reply_id;  // Variable to store reply ID

    // 1. Creating a new thread
    test('1. POST /api/threads/{board}', function (done) {
        chai.request(server)
            .post('/api/threads/testboard')
            .send({ text: 'Test Thread', delete_password: '1234' })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.equal(res.body.text, 'Test Thread');
                assert.property(res.body, '_id');
                thread_id = res.body._id; // Save thread ID for future tests
                done();
            });
    });

    // 2. Viewing the 10 most recent threads with 3 replies each
    test('2. GET /api/threads/{board}', function (done) {
        chai.request(server)
            .get('/api/threads/testboard')
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isArray(res.body);
                assert.isAtMost(res.body.length, 10);
                res.body.forEach(thread => {
                    assert.isAtMost(thread.replies.length, 3);
                });
                done();
            });
    });

    // 3. Deleting a thread with the incorrect password
    test('3. DELETE /api/threads/{board} with incorrect password', function (done) {
        chai.request(server)
            .delete('/api/threads/testboard')
            .send({ thread_id, delete_password: 'wrongpassword' })
            .end(function (err, res) {
                assert.equal(res.text, 'incorrect password');
                done();
            });
    });

    // 5. Reporting a thread
    test('5. PUT /api/threads/{board}', function (done) {
        chai.request(server)
            .put('/api/threads/testboard')
            .send({ thread_id })
            .end(function (err, res) {
                assert.equal(res.text, 'reported');
                done();
            });
    });







    // 6. Creating a new reply
    test('6. POST /api/replies/{board}', function (done) {
        chai.request(server)
            .post('/api/replies/testboard')
            .send({ thread_id, text: 'Test Reply', delete_password: '5678' })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.property(res.body, 'message');
                reply_id = res.body.reply_id; // Save reply ID for future tests
                console.log('rplid', reply_id, res.body)
                done();
            });
    });

    // 7. Viewing a single thread with all replies
    test('7. GET /api/replies/{board}', function (done) {
        chai.request(server)
            .get(`/api/replies/testboard?thread_id=${thread_id}`)
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.property(res.body, 'replies');
                assert.isArray(res.body.replies);
                done();
            });
    });





    // 8. Deleting a reply with the incorrect password
    test('8. DELETE /api/replies/{board} with incorrect password', function (done) {
        chai.request(server)
            .delete('/api/replies/testboard')
            .send({ thread_id, reply_id, delete_password: 'wrongpassword' })
            .end(function (err, res) {
                assert.equal(res.text, 'incorrect password');
                done();
            });
    });


    // 10. Reporting a reply
    test('10. PUT /api/replies/{board}', function (done) {
        
        chai.request(server)
            .put('/api/replies/testboard')
            .send({ thread_id, reply_id })
            .end(function (err, res) {
                assert.equal(res.text, 'reported');
                done();
            });


    });

    // 9. Deleting a reply with the correct password
    test('9. DELETE /api/replies/{board} with correct password', function (done) {
        chai.request(server)
            .delete('/api/replies/testboard')
            .send({ thread_id, reply_id, delete_password: '5678' })
            
            .end(function (err, res) {
                console.log(thread_id, reply_id, '--- beide ids')
                assert.equal(res.text, 'success');
                done();
            });
    });



    // 4. Deleting a thread with the correct password
    test('4. DELETE /api/threads/{board} with correct password', function (done) {
        chai.request(server)
            .delete('/api/threads/testboard')
            .send({ thread_id, delete_password: '1234' })
            .end(function (err, res) {
                assert.equal(res.text, 'success');
                done();
            });
    });

});
