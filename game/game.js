Stories = new Mongo.Collection("stories");

Router.route('/', function () {
    this.render('storyList');
}, {
    name: 'list'
});

Router.route('/stories/:_id', function () {
    var item = Stories.findOne({_id: this.params._id});
    this.render('story', {data: item});
}, {
    name: 'single'
});

if (Meteor.isClient) {
    if(typeof Session.get('story') === 'undefined') {
        Tracker.autorun(function() {
            var story = Stories.findOne();
            if(typeof story !== 'undefined') {
                Session.set('story', story._id);
            }
        });
    }

    var maxLockTime = 5000;
    var time = new Tracker.Dependency();
    setInterval(function() {
        time.changed();
    }, 1000);

    Template.main.helpers({
        user: function () {
            return Meteor.user();
        }
    });
    Template.storyList.helpers({
        user: function() {
            return Meteor.user();
        },
        stories: function() {
            return Stories.find();
        }
    });
    Template.storyList.events({
        'keypress input': function (event) {
            if (event.keyCode === 13) {
                Stories.insert({
                    title: event.target.value,
                    lock: null,
                    sentences: [],
                    words: []
                }, function(err, id) {
                    Router.go('single', {
                        _id: id
                    });
                });
                event.target.value = '';
            }
        }
    });

    Template.story.helpers({
        user: function() {
            return Meteor.user();
        },
        addingDisabled: function () {
            var lock = Stories.findOne(Session.get('story')).lock;
            return (lock && lock.author._id !== Meteor.userId()) ? 'disabled' : '';
        },
        timeoutValue: function() {
            time.depend();
            var lock = Stories.findOne(Session.get('story')).lock;
            if(!lock || lock.author._id === Meteor.userId()) {
                return;
            }
            var timeUsed = Date.now() - lock.time;
            var timeRemaining = maxLockTime - timeUsed;
            if(timeRemaining < 0) {
                Stories.update(Session.get('story'), {
                    $set: {
                        lock: null
                    }
                });
                return;
            }

            return {'value': timeRemaining};
        },
        lastWord: function () {
            var story = Stories.findOne(Session.get('story'));
            return story.words[story.words.length - 1];
        },
        story: function () {
            return Stories.findOne(Session.get('story'));
        }
    });
    Template.story.events({
        'keypress input': function (event) {
            var word = event.target.value.trim();
            if (event.keyCode === 13) {
                event.target.value = '';
                if(word.charAt(word.length - 1) === '.') {
                    word = word.substr(0, word.length - 1);
                    var sentence = {
                        words: Stories.findOne(Session.get('story')).words
                    };
                    sentence.words.push({
                        author: Meteor.user(),
                        word: word
                    });
                    Stories.update(Session.get('story'), {
                        $set: {
                            lock: null,
                            words: []
                        },
                        $push: {
                            sentences: sentence
                        }
                    });
                } else {
                    Stories.update(Session.get('story'), {
                        $set: {
                            lock: null
                        },
                        $push: {
                            words: {
                                author: Meteor.user(),
                                word: word
                            }
                        }
                    });
                }
            } else if (!Stories.findOne(Session.get('story')).lock) {
                Stories.update(Session.get('story'), {
                    $set: {
                        lock: {
                            author: Meteor.user(),
                            time: Date.now()
                        }
                    }
                });
            }
        }
    });
}
