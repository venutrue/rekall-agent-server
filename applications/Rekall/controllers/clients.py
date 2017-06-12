# Controller to manage clients.
import api
import utils

from gluon.globals import current


def index():
    form = FORM('Search:', INPUT(_name='q'), INPUT(_type='submit'))
    form.accepts(request, session)
    return dict(form=form)


def request_approval():
    """Request an approval to view client."""
    client_id = request.vars.client_id
    if client_id:
        roles = ["Examiner", "Investigator"]
        approvers = api.api_dispatcher.call(
            current, "client.approver.list", client_id).get("data")
        inputs = [SELECT(*roles,
                         _name="role",
                         requires=IS_IN_SET(roles)),
                  SELECT(*sorted(approvers),
                         _name="approver",
                         requires=IS_IN_SET(approvers)),
        ]

        form = utils.build_form(inputs)
        if form.accepts(request, session):
            # Request an approval from the API
            api.api_dispatcher.call(
                current, "client.approver.request", client_id,
                form.vars.approver, form.vars.role)
            #redirect(URL(c="default", f="index"))

        return dict(form=form, client_id=client_id)


def approve_request():
    """Approves a request from another user."""
    client_id = request.vars.client_id
    role = request.vars.role
    user = request.vars.user
    if client_id and role and user:
        return dict(client_id=client_id, user=user, role=role)
